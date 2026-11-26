/**
 * Controllers_Api_Reuniones.gs — reuniones semanales de casos.
 */
function apiListarReuniones(){ return svcReunionesListar_(); }
function apiGuardarReunion(params){
  if(!params) return responseError_('Faltan datos.');
  return svcReunionGuardar_(params);
}
function apiEliminarReunion(params){
  if(!params || !params.id) return responseError_('Faltan datos.');
  return svcReunionEliminar_(params.id);
}
