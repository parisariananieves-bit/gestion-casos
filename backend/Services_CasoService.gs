/**
 * Services_CasoService.gs
 * Reglas de negocio sobre Casos — validaciones, transiciones de estado,
 * asignación. Los Controllers llaman a estas funciones, nunca a Database
 * directamente, así la lógica queda en un solo lugar.
 */

var ESTADOS_VALIDOS_ = ['nuevo','analisis','esperando','derivado','resuelto','cerrado'];
var PRIORIDADES_VALIDAS_ = ['Alta','Media','Baja'];

function svcCasosListar_(filtros){
  filtros = filtros || {};
  var casos = dbCasosListarTodos_();
  if(filtros.estado) casos = casos.filter(function(c){ return c.estado===filtros.estado; });
  if(filtros.prioridad) casos = casos.filter(function(c){ return c.prioridad===filtros.prioridad; });
  if(filtros.sector) casos = casos.filter(function(c){ return c.sector===filtros.sector; });
  if(filtros.responsable) casos = casos.filter(function(c){ return c.responsable===filtros.responsable; });
  if(filtros.marca) casos = casos.filter(function(c){ return c.marca===filtros.marca; });
  if(filtros.fuente) casos = casos.filter(function(c){ return c.fuente===filtros.fuente; });
  if(String(filtros.soloAbiertos)==='true') casos = casos.filter(function(c){ return c.estado!=='cerrado' && c.estado!=='resuelto'; });
  if(String(filtros.soloResueltos)==='true') casos = casos.filter(function(c){ return c.estado==='cerrado' || c.estado==='resuelto'; });
  if(String(filtros.soloVencidos)==='true') casos = casos.filter(function(c){ var v = utilParseFechaTexto_(c.slaVencimiento); return v && v < new Date() && c.estado!=='cerrado' && c.estado!=='resuelto'; });
  if(String(filtros.soloSinAsignar)==='true') casos = casos.filter(function(c){ return !c.responsable; });
  if(String(filtros.soloDefensaConsumidor)==='true') casos = casos.filter(function(c){ return c.defensaConsumidor===true || String(c.defensaConsumidor)==='true'; });
  return casos.sort(function(a,b){ return utilFechaMs_(b.fechaCreacion) - utilFechaMs_(a.fechaCreacion); });
}

function svcCasoObtener_(id){
  var caso = dbCasosBuscarPorId_(id);
  if(!caso) return null;
  caso.seguimientos = dbSeguimientosPorCaso_(id);
  caso.timelineVin = caso.dominio ? dbTimelinePorVin_(caso.dominio) : [];
  caso.actas = svcActasPorCaso_(id); // minutas en las que se trató este caso (Etapa 5)
  return caso;
}

// Creación manual (desde la Bandeja de entrada, o desde la web con
// "Reportar un caso") — pasa igual por el Motor de Eventos, así queda
// registrado como Evento antes de convertirse en Caso, sin excepciones.
function svcCasoCrearManual_(datos, usuario){
  datos.fuente = datos.fuente || 'Manual';
  datos.datosOriginales = datos;
  var resultado = recibirEvento(datos);
  if(!resultado.ok) return resultado;

  // En Etapa 1 (creación automática apagada), forzamos la creación acá
  // mismo porque el flujo manual SÍ quiere el caso ya, no revisión diferida.
  if(!resultado.casoGenerado){
    var datosNormalizados = normalizarPayloadEvento_(datos);
    var evaluacion = evaluarEvento_(datosNormalizados);
    evaluacion.fuente = datos.fuente;
    var idCaso = crearCasoDesdeEvento_(datosNormalizados, evaluacion, resultado.id);
    dbEventosMarcarProcesado_(resultado.id, idCaso, '');
    if(usuario) dbCasosActualizarCampos_(idCaso, {creadoPor: usuario});
    return responseOk_({id: idCaso, codigo: idCaso, coincidencias: evaluacion.coincidencias.length});
  }
  return responseOk_({id: resultado.casoGenerado, codigo: resultado.casoGenerado});
}

function svcCasoCambiarEstado_(id, nuevoEstado, autor, comentario){
  if(ESTADOS_VALIDOS_.indexOf(nuevoEstado)===-1) return responseError_('Estado inválido: '+nuevoEstado);
  var caso = dbCasosBuscarPorId_(id);
  if(!caso) return responseError_('No se encontró el caso.');
  svcCasoMarcarPrimerContactoSiFalta_(id, caso);

  var campos = {estado: nuevoEstado};
  if(nuevoEstado==='resuelto' || nuevoEstado==='cerrado'){
    campos.cerradoFecha = utilAhoraTexto_();
    campos.cerradoMotivo = comentario || '';
    campos.proximaAccion = nuevoEstado==='cerrado' ? 'Archivado' : 'Cerrado — conforme';
  }
  // Reapertura (Etapa 4 — indicador "casos reabiertos"): si ya estaba
  // resuelto/cerrado y pasa a cualquier otro estado, queda marcado para
  // siempre como "reabierto alguna vez" — no se vuelve a desmarcar, es un
  // indicador histórico, no el estado actual.
  var eraCerrado = caso.estado==='resuelto' || caso.estado==='cerrado';
  var sigueCerrado = nuevoEstado==='resuelto' || nuevoEstado==='cerrado';
  if(eraCerrado && !sigueCerrado){
    campos.reabierto = true;
  }
  dbCasosActualizarCampos_(id, campos);
  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: id, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
    tipo: 'cambio_estado', texto: 'Estado cambiado a "'+nuevoEstado+'"' + (comentario?': '+comentario:''),
    visibleParaReportante: true
  });
  if(caso.dominio){
    dbTimelineAgregar_({
      id: utilNuevoIdTimeline_(), vin: caso.dominio, fecha: utilAhoraTexto_(),
      tipoEvento: 'Cambio de estado', descripcion: nuevoEstado, casoRelacionado: id, fuente: 'Manual'
    });
  }
  if(eraCerrado && !sigueCerrado){
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: id, fecha: utilAhoraTexto_(), autor: 'Sistema',
      tipo: 'sistema', texto: '♻️ Caso reabierto — estaba '+caso.estado+' y pasó a '+nuevoEstado+'.',
      visibleParaReportante: false
    });
  }
  return responseOk_({});
}

// Marca la fecha del primer contacto real con el caso (primera asignación
// o primer cambio de estado), si todavía no estaba marcada — alimenta el
// indicador "tiempo hasta el primer contacto" del punto 11 de la
// especificación de reclamos, sin agregar una hoja ni un flujo nuevo.
function svcCasoMarcarPrimerContactoSiFalta_(id, caso){
  if(caso && !caso.fechaPrimerContacto){
    dbCasosActualizarCampos_(id, {fechaPrimerContacto: utilAhoraTexto_()});
  }
}

function svcCasoAsignar_(id, responsable, autor){
  var caso = dbCasosBuscarPorId_(id);
  if(!caso) return responseError_('No se encontró el caso.');
  svcCasoMarcarPrimerContactoSiFalta_(id, caso);
  dbCasosActualizarCampos_(id, {responsable: responsable, proximaAccion: 'En gestión'});
  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: id, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
    tipo: 'asignacion', texto: 'Asignado a '+responsable, visibleParaReportante: false
  });
  utilNotificarAsignacionCaso_(caso, responsable, 'asignado', autor);
  return responseOk_({});
}

// Derivar: además de asignar el caso a una persona de otro sector, lo marca
// en estado "derivado" para que quede claro que lo sigue esa persona EN
// CONJUNTO con Calidad (no que Calidad se desentiende del caso).
function svcCasoDerivar_(id, responsable, autor, comentario){
  var caso = dbCasosBuscarPorId_(id);
  if(!caso) return responseError_('No se encontró el caso.');
  dbCasosActualizarCampos_(id, {responsable: responsable, estado: 'derivado', proximaAccion: 'Seguimiento conjunto con '+responsable});
  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: id, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
    tipo: 'asignacion',
    texto: 'Derivado a '+responsable+' — sigue en conjunto con Calidad'+(comentario?': '+comentario:''),
    visibleParaReportante: false
  });
  if(caso.dominio){
    dbTimelineAgregar_({
      id: utilNuevoIdTimeline_(), vin: caso.dominio, fecha: utilAhoraTexto_(),
      tipoEvento: 'Caso derivado', descripcion: 'Derivado a '+responsable, casoRelacionado: id, fuente: 'Manual'
    });
  }
  utilNotificarAsignacionCaso_(caso, responsable, 'derivado', autor);
  return responseOk_({});
}

function svcCasoCambiarPrioridad_(id, prioridad, autor){
  if(PRIORIDADES_VALIDAS_.indexOf(prioridad)===-1) return responseError_('Prioridad inválida.');
  var caso = dbCasosBuscarPorId_(id);
  if(!caso) return responseError_('No se encontró el caso.');
  dbCasosActualizarCampos_(id, {prioridad: prioridad, slaVencimiento: utilCalcularSLA_(prioridad)});
  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: id, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
    tipo: 'cambio_prioridad', texto: 'Prioridad cambiada a '+prioridad, visibleParaReportante: false
  });
  return responseOk_({});
}

function svcCasoComentar_(id, autor, texto, visibleParaReportante){
  if(!texto || !texto.trim()) return responseError_('El comentario está vacío.');
  var caso = dbCasosBuscarPorId_(id);
  if(!caso) return responseError_('No se encontró el caso.');
  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: id, fecha: utilAhoraTexto_(), autor: autor||'—',
    tipo: 'comentario', texto: texto.trim(), visibleParaReportante: !!visibleParaReportante
  });
  dbCasosActualizarCampos_(id, {}); // solo para tocar fechaUltimaActualizacion
  return responseOk_({});
}

// Marcar/desmarcar Defensa del Consumidor después de creado el caso (no
// solo al reportarlo) — a veces se sabe recién más adelante en la gestión.
function svcCasoToggleDefensaConsumidor_(id, activo, autor){
  var caso = dbCasosBuscarPorId_(id);
  if(!caso) return responseError_('No se encontró el caso.');
  dbCasosActualizarCampos_(id, {defensaConsumidor: !!activo});
  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: id, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
    tipo: 'sistema', texto: activo ? '⚖️ Marcado como Defensa del Consumidor' : 'Desmarcado de Defensa del Consumidor',
    visibleParaReportante: false
  });
  return responseOk_({});
}

function svcCasoBuscarCliente_(query){
  var q = utilNormalizarTexto_(query);
  var esDni = utilEsDni_(query);
  var porVin = dbCasosBuscarPorVin_(query);
  var porCliente = dbCasosBuscarPorCliente_(query);
  var vistos = {};
  var todos = porVin.concat(porCliente).filter(function(c){
    if(vistos[c.id]) return false;
    vistos[c.id]=true; return true;
  });
  return responseOk_({casos: todos, esDni: esDni});
}

// Próximo paso con fecha: qué falta hacer y para cuándo. Se ve en el caso, en
// el tablero/lista (en rojo si ya venció) y en el resumen diario por mail.
// fecha viene como "yyyy-MM-dd" (campo de fecha del navegador) o vacía para borrarlo.
function svcCasoFijarProximoPaso_(id, texto, fecha, autor){
  var caso = dbCasosBuscarPorId_(id);
  if(!caso) return responseError_('No se encontró el caso.');
  var fechaTxt = '';
  if(fecha){
    var m = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
    fechaTxt = m ? (m[3]+'/'+m[2]+'/'+m[1]) : String(fecha);
  }
  dbCasosActualizarCampos_(id, {proximoPasoTexto: texto||'', proximoPasoFecha: fechaTxt});
  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: id, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
    tipo: 'sistema',
    texto: texto ? ('📌 Próximo paso'+(fechaTxt?' para el '+fechaTxt:'')+': '+texto) : '📌 Se quitó el próximo paso.',
    visibleParaReportante: false
  });
  return responseOk_({});
}
