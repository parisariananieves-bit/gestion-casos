/**
 * Controllers_Api_Dashboard.gs
 */
function apiObtenerResumenDashboard(params){
  return svcDashboardResumen_(params||{});
}
function apiObtenerConfig(){
  return svcConfigObtener_();
}
function apiAgregarCatalogoItem(params){
  if(!params || !params.nombre || !params.valor) return responseError_('Faltan datos.');
  return svcCatalogoAgregarItem_(params.nombre, params.valor);
}
function apiEliminarCatalogoItem(params){
  if(!params || !params.nombre || !params.valor) return responseError_('Faltan datos.');
  return svcCatalogoEliminarItem_(params.nombre, params.valor);
}
function apiActualizarConfig(params){
  if(!params || !params.clave) return responseError_('Falta la clave.');
  return svcConfigActualizar_(params.clave, params.valor);
}
