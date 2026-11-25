/**
 * Controllers_Api_Casos.gs
 * Cada función acá es un endpoint que Web_Code.gs enruta desde doGet/doPost.
 * Los Controllers NO tienen lógica de negocio — solo validan que lleguen los
 * parámetros mínimos y llaman al Service correspondiente.
 */

function apiListarCasos(params){
  return responseOk_({casos: svcCasosListar_(params||{})});
}

function apiObtenerCaso(params){
  if(!params || !params.id) return responseError_('Falta el ID del caso.');
  var caso = svcCasoObtener_(params.id);
  return caso ? responseOk_({caso: caso}) : responseError_('No se encontró el caso.');
}

function apiCrearCaso(params){
  if(!params || !params.cliente) return responseError_('Falta el nombre del cliente.');
  return svcCasoCrearManual_(params, params.usuario);
}

function apiCambiarEstadoCaso(params){
  if(!params || !params.id || !params.estado) return responseError_('Faltan datos.');
  return svcCasoCambiarEstado_(params.id, params.estado, params.autor, params.comentario);
}

function apiAsignarCaso(params){
  if(!params || !params.id || !params.responsable) return responseError_('Faltan datos.');
  return svcCasoAsignar_(params.id, params.responsable, params.autor);
}

function apiDerivarCaso(params){
  if(!params || !params.id || !params.responsable) return responseError_('Faltan datos.');
  return svcCasoDerivar_(params.id, params.responsable, params.autor, params.comentario);
}

function apiCambiarPrioridadCaso(params){
  if(!params || !params.id || !params.prioridad) return responseError_('Faltan datos.');
  return svcCasoCambiarPrioridad_(params.id, params.prioridad, params.autor);
}

function apiComentarCaso(params){
  if(!params || !params.id || !params.texto) return responseError_('Faltan datos.');
  return svcCasoComentar_(params.id, params.autor, params.texto, params.visibleParaReportante);
}

function apiToggleDefensaConsumidor(params){
  if(!params || !params.id) return responseError_('Faltan datos.');
  return svcCasoToggleDefensaConsumidor_(params.id, params.activo, params.autor);
}

function apiBuscarClienteCaso(params){
  if(!params || !params.query) return responseError_('Falta el término de búsqueda.');
  return svcCasoBuscarCliente_(params.query);
}

function apiTimelinePorVin(params){
  if(!params || !params.vin) return responseError_('Falta el VIN/patente.');
  return svcTimelinePorVin_(params.vin);
}

function apiEventosPendientes(params){
  return responseOk_({eventos: svcEventosPendientesRevision_()});
}

function apiConfirmarEventoComoCaso(params){
  if(!params || !params.idEvento) return responseError_('Falta el ID del evento.');
  return svcEventoConfirmarComoCaso_(params.idEvento, params.usuario);
}

function apiDescartarEvento(params){
  if(!params || !params.idEvento) return responseError_('Falta el ID del evento.');
  return svcEventoDescartar_(params.idEvento, params.motivo);
}

function apiFijarProximoPaso(params){
  if(!params || !params.id) return responseError_('Faltan datos.');
  return svcCasoFijarProximoPaso_(params.id, params.texto, params.fecha, params.autor);
}

function apiEliminarCaso(params){
  if(!params || !params.id) return responseError_('Faltan datos.');
  return svcCasoEliminar_(params.id, params.autor);
}
