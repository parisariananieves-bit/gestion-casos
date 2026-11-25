/**
 * Engine_EventEngine.gs
 * El corazón de la arquitectura v3. Ninguna fuente externa crea un caso
 * directamente — todo pasa primero por acá como un Evento crudo, y recién
 * después el motor decide qué hacer. Esto separa "capturar información" de
 * "decidir negocio", así una fuente nueva el día de mañana (una encuesta que
 * hoy no existe, un canal nuevo) se suma sin tocar la lógica de casos.
 *
 * Contrato de entrada (lo que cualquier conector futuro — Planning, WhatsApp,
 * mail, NPS — le tiene que dar a recibirEvento):
 *   {
 *     fuente: 'Planning' | 'WhatsApp' | 'Mail' | 'NPS' | 'Mini encuesta' | 'Manual' | 'Automático',
 *     vin: '...',            // opcional, pero recomendado — ver §5 del doc de arquitectura
 *     cliente: '...',        // nombre del cliente/contacto
 *     dni: '...', telefono: '...', email: '...',   // opcionales, para matching
 *     motivo: '...', descripcion: '...',
 *     prioridadSugerida: 'Alta'|'Media'|'Baja',     // opcional
 *     datosOriginales: {...}                        // el payload tal cual llegó, sin tocar
 *   }
 */

function recibirEvento(payload){
  if(!payload) return responseError_('Evento vacío.');

  var datosNormalizados = normalizarPayloadEvento_(payload);
  var hash = utilHashSimple_(JSON.stringify(payload) + '|' + (payload.fuente||''));

  // Duplicado exacto (ej. doble submit) — no se vuelve a procesar, se
  // devuelve el resultado del evento original tal cual quedó.
  var existente = dbEventosBuscarPorHash_(hash);
  if(existente){
    return responseOk_({ id: existente.id, duplicado:true, casoGenerado: existente.casoGenerado || null });
  }

  var idEvento = utilNuevoIdEvento_();
  var evento = {
    id: idEvento,
    fechaRecepcion: utilAhoraTexto_(),
    fuente: payload.fuente || 'Manual',
    vin: datosNormalizados.vin || '',
    cliente: datosNormalizados.cliente || '',
    payloadOriginal: payload,
    datosNormalizados: datosNormalizados,
    hashEvento: hash,
    procesado: false,
    casoGenerado: '',
    motivoDescarte: ''
  };
  dbEventosCrear_(evento);

  // El motor evalúa reglas (coincidencias, prioridad automática, etc.)
  var evaluacion = evaluarEvento_(datosNormalizados);

  var crearAutomatico = String(dbConfigLeer_(CONFIG_KEYS.CREAR_CASOS_AUTOMATICO, 'false')) === 'true';

  if(!crearAutomatico){
    // Etapa 1: el motor registra y evalúa, pero NO crea el caso solo —
    // queda anotado en el evento para revisión manual desde la Bandeja.
    dbEventosMarcarProcesado_(idEvento, '', 'Creación automática desactivada — revisar manualmente.');
    return responseOk_({ id: idEvento, casoGenerado: null, evaluacion: evaluacion, requiereRevisionManual: true });
  }

  // No duplicar: si este mismo vehículo YA tiene un caso abierto (no
  // resuelto/cerrado), el evento nuevo no abre un caso paralelo — se suma
  // como novedad al que ya está en curso. Pasa, por ejemplo, cuando una
  // misma alerta de Planning llega más de una vez, o cuando aparece un
  // segundo síntoma del mismo auto mientras el caso anterior sigue abierto.
  var casoAbiertoCoincidente = buscarCasoDuplicado_(datosNormalizados, payload.fuente);
  if(casoAbiertoCoincidente){
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: casoAbiertoCoincidente.id, fecha: utilAhoraTexto_(), autor: 'Sistema',
      tipo: 'sistema',
      texto: '🔁 Nuevo evento recibido de "'+(payload.fuente||'Manual')+'" para este mismo vehículo — se sumó acá en vez de abrir un caso nuevo (era un duplicado).'+
        (datosNormalizados.motivo ? ' Motivo: '+datosNormalizados.motivo : '') + (datosNormalizados.descripcion ? ' — '+datosNormalizados.descripcion : ''),
      visibleParaReportante: false
    });
    dbEventosMarcarProcesado_(idEvento, casoAbiertoCoincidente.id, 'Fusionado con caso abierto existente ('+casoAbiertoCoincidente.id+') — mismo vehículo, no se duplicó.');
    return responseOk_({ id: idEvento, casoGenerado: casoAbiertoCoincidente.id, fusionadoConCasoExistente: true });
  }

  var idCaso = crearCasoDesdeEvento_(datosNormalizados, evaluacion, idEvento);
  dbEventosMarcarProcesado_(idEvento, idCaso, '');
  return responseOk_({ id: idEvento, casoGenerado: idCaso });
}

// Un caso "abierto" para el mismo VIN/dominio — no cuenta a los ya
// resueltos/cerrados, porque ahí sí corresponde un caso nuevo (es un
// problema distinto, en otro momento). Reusa dbCasosBuscarPorVin_, que ya
// filtra por coincidencia exacta de dominio.
function buscarCasoAbiertoPorVin_(vin){
  if(!vin) return null;
  var abiertos = dbCasosBuscarPorVin_(vin).filter(function(c){
    return c.estado!=='resuelto' && c.estado!=='cerrado';
  });
  return abiertos.length ? abiertos[0] : null;
}

// ¿Este evento es un duplicado de un caso que ya existe? Si sí, no se abre
// otro caso: se suma como novedad al existente. Cuenta como duplicado:
//  1) mismo origen (el mismo evento/entrega de Planning), en cualquier estado;
//  2) mismo VIN/dominio con un caso todavía abierto;
//  3) mismo VIN/dominio o DNI, misma fuente y mismo motivo, en los últimos 14 días
//     (aunque el anterior ya esté cerrado: es la misma alerta que volvió a llegar).
function buscarCasoDuplicado_(datos, fuente){
  var todos = dbCasosListarTodos_();
  var norm = function(v){ return String(v||'').replace(/\s+/g,'').toUpperCase(); };
  var vin = norm(datos.vin), dni = norm(datos.dni), origen = String(datos.origenId||'').trim();
  var motivo = String(datos.motivo||'').trim().toLowerCase();
  var ahora = Date.now(), ventana = 14*24*60*60*1000;
  var abierto = function(c){ return c.estado!=='resuelto' && c.estado!=='cerrado'; };
  var candidatos = todos.filter(function(c){
    if(origen && String(c.origenId||'').trim()===origen) return true;
    var mismoVeh = vin && norm(c.dominio)===vin;
    if(mismoVeh && abierto(c)) return true;
    var mismaPersona = mismoVeh || (dni && norm(c.dni)===dni);
    if(mismaPersona && String(c.fuente||'')===String(fuente||'') && String(c.motivo||'').trim().toLowerCase()===motivo){
      var f = utilParseFechaTexto_(c.fechaCreacion);
      return !!f && (ahora - f.getTime()) <= ventana;
    }
    return false;
  });
  if(!candidatos.length) return null;
  candidatos.sort(function(a,b){ return utilFechaMs_(b.fechaCreacion) - utilFechaMs_(a.fechaCreacion); });
  var abiertos = candidatos.filter(abierto);
  return abiertos.length ? abiertos[0] : candidatos[0];
}

function normalizarPayloadEvento_(payload){
  return {
    vin: utilNormalizarTexto_(payload.vin || payload.dominio || payload.patente || ''),
    cliente: payload.cliente || '',
    dni: payload.dni || '',
    telefono: payload.telefono || '',
    email: payload.email || '',
    marca: payload.marca || '',
    modelo: payload.modelo || '',
    sucursal: payload.sucursal || '',
    sector: payload.sector || '',
    unidad: payload.unidad || '',
    tipoCaso: payload.tipoCaso || 'Otro',
    motivo: payload.motivo || '',
    descripcion: payload.descripcion || '',
    defensaConsumidor: !!payload.defensaConsumidor,
    prioridadSugerida: payload.prioridadSugerida || 'Media',
    origenId: payload.origenId || '',
    // --- Agregado: formulario público de reclamos ---
    solucionEsperada: payload.solucionEsperada || '',
    evidencias: Array.isArray(payload.evidencias) ? payload.evidencias : []
  };
}

// Convierte un evento ya evaluado en un Caso real (usado tanto en modo
// automático como cuando alguien confirma manualmente desde la Bandeja).
function crearCasoDesdeEvento_(datos, evaluacion, idEventoOrigen){
  var idCaso = utilNuevoIdCaso_();
  var prioridad = evaluacion.prioridadSugerida || datos.prioridadSugerida || 'Media';
  var caso = {
    id: idCaso,
    fechaCreacion: utilAhoraTexto_(),
    estado: 'nuevo',
    prioridad: prioridad,
    cliente: datos.cliente,
    dni: datos.dni,
    telefono: datos.telefono,
    email: datos.email,
    marca: datos.marca,
    modelo: datos.modelo,
    dominio: datos.vin,
    sucursal: datos.sucursal,
    sector: datos.sector,
    unidad: datos.unidad,
    tipoCaso: datos.tipoCaso,
    motivo: datos.motivo,
    descripcion: datos.descripcion,
    responsable: '',
    fuente: evaluacion.fuente || 'Manual',
    origenId: datos.origenId || idEventoOrigen,
    proximaAccion: 'Asignar responsable',
    fechaUltimaActualizacion: utilAhoraTexto_(),
    slaVencimiento: utilCalcularSLA_(prioridad),
    estadoSync: 'sincronizado',
    defensaConsumidor: !!evaluacion.seguimientoPrioritario || !!datos.defensaConsumidor,
    expedienteRelacionado: evaluacion.expedienteRelacionado || '',
    creadoPor: 'Motor de Eventos',
    // --- Agregado: formulario público de reclamos — campos que quedan
    // vacíos para cualquier otra fuente (Planning, NPS, Manual, etc.) ---
    solucionEsperada: datos.solucionEsperada || '',
    evidencias: JSON.stringify(Array.isArray(datos.evidencias) ? datos.evidencias : []),
    tokenSeguimiento: utilNuevoTokenSeguimiento_(),
    fechaPrimerContacto: ''
  };
  dbCasosCrear_(caso);

  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: idCaso, fecha: utilAhoraTexto_(),
    autor: 'Sistema', tipo: 'sistema',
    texto: 'Caso creado automáticamente desde evento (' + (evaluacion.fuente||'Manual') + ').',
    visibleParaReportante: false
  });

  if(datos.vin){
    dbTimelineAgregar_({
      id: utilNuevoIdTimeline_(), vin: datos.vin, fecha: utilAhoraTexto_(),
      tipoEvento: 'Caso abierto', descripcion: datos.motivo || datos.tipoCaso,
      casoRelacionado: idCaso, fuente: evaluacion.fuente || 'Manual'
    });
  }

  if(evaluacion.coincidencias && evaluacion.coincidencias.length){
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: idCaso, fecha: utilAhoraTexto_(),
      autor: 'Sistema', tipo: 'sistema',
      texto: '⚠ Coincidencia detectada con ' + evaluacion.coincidencias.length + ' caso(s) previo(s) de este cliente/vehículo — revisar antes de duplicar esfuerzos.',
      visibleParaReportante: false
    });
  }

  return idCaso;
}
