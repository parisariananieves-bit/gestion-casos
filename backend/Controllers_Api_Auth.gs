/**
 * Controllers_Api_Auth.gs
 */
function apiLogin(params){
  if(!params || !params.usuario || !params.password) return responseError_('Faltan usuario o contraseña.');
  return svcLogin_(params.usuario, params.password);
}
