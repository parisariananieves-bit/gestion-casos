/**
 * Controllers_Api_Reclamos.gs
 * Endpoints públicos (SIN login) para el formulario de reclamos de
 * clientes y el link de seguimiento. Mismo criterio que el resto de los
 * Controllers: solo validan los parámetros mínimos y llaman al Service.
 *
 * IMPORTANTE: estas tres acciones son las únicas que Web_Code.gs enruta
 * sin pasar por apiLogin — por diseño, porque el cliente final no tiene
 * (ni debe tener) usuario ni contraseña del sistema interno.
 */

function apiReclamoPublicoCrear(params){
  if(!params) return responseError_('Faltan datos.');
  return svcReclamoPublicoCrear_(params, params.archivos||[]);
}

function apiReclamoValidarToken(params){
  if(!params || !params.id || !params.token) return responseError_('Faltan datos.');
  return svcReclamoValidarToken_(params.id, params.token, params.clave, params.usuario, params.password);
}

function apiReclamoSeguimientoAgregar(params){
  if(!params || !params.id || !params.token) return responseError_('Faltan datos.');
  return svcReclamoAgregarSeguimiento_(params.id, params.token, params.comentario||'', params.archivos||[], params.clave, params.nombre, params.usuario, params.password);
}
