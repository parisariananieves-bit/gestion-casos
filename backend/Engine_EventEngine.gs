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

  var idCaso = crearCasoDesdeEvento_(datosNormalizados, evaluacion, idEvento);
  dbEventosMarcarProcesado_(idEvento, idCaso, '');
  return responseOk_({ id: idEvento, casoGenerado: idCaso });
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
