/**
 * Controllers_Api_Usuarios.gs
 * Gestión de equipo — crear, listar, editar y activar/desactivar usuarios.
 * Todas las acciones que modifican algo requieren credenciales de un
 * usuario con rol 'calidad' (actorUsuario/actorPassword), mismo patrón que
 * ya usa Planning para su pantalla de Usuarios.
 */

function apiListarUsuarios(params){
  if(!params || !params.actorUsuario || !params.actorPassword) return responseError_('Faltan credenciales.');
  return svcUsuariosListar_(params.actorUsuario, params.actorPassword);
}

function apiUsuariosActivosParaAsignar(){
  return svcUsuariosActivosParaAsignar_();
}

function apiCrearUsuario(params){
  if(!params || !params.actorUsuario || !params.actorPassword) return responseError_('Faltan credenciales.');
  return svcUsuarioCrear_(params.actorUsuario, params.actorPassword, {
    nombre: params.nombre, usuario: params.usuario, password: params.password,
    rol: params.rol, sector: params.sector, email: params.email
  });
}

function apiEditarUsuario(params){
  if(!params || !params.actorUsuario || !params.actorPassword || !params.usuarioObjetivo) return responseError_('Faltan datos.');
  return svcUsuarioEditar_(params.actorUsuario, params.actorPassword, params.usuarioObjetivo, {
    nombre: params.nombre, rol: params.rol, sector: params.sector, email: params.email
  });
}

function apiDesactivarUsuario(params){
  if(!params || !params.actorUsuario || !params.actorPassword || !params.usuarioObjetivo) return responseError_('Faltan datos.');
  return svcUsuarioDesactivar_(params.actorUsuario, params.actorPassword, params.usuarioObjetivo, params.activo!==false);
}

function apiImportarUsuarios(params){
  if(!params || !params.actorUsuario || !params.actorPassword || !params.nombres) return responseError_('Faltan datos.');
  var nombres = Array.isArray(params.nombres) ? params.nombres : String(params.nombres).split('\n');
  return svcUsuariosImportarLista_(params.actorUsuario, params.actorPassword, nombres);
}
