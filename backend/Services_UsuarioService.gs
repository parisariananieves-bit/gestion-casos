/**
 * Services_UsuarioService.gs
 * Login + gestión del equipo (crear, editar, activar/desactivar usuarios).
 * Solo alguien con rol 'calidad' puede crear o modificar usuarios — mismo
 * criterio de "actor + password" que ya usa Planning para estas acciones.
 */
function svcLogin_(usuario, password){
  var u = dbUsuariosVerificar_(usuario, password);
  if(!u) return responseError_('Usuario o contraseña incorrectos.');
  return responseOk_({nombre: u.nombre, usuario: u.usuario, rol: u.rol, sector: u.sector});
}

var ROLES_VALIDOS_GC_ = ['calidad','sector','referente'];

function requiereCalidadGC_(actorUsuario, actorPassword){
  var actor = dbUsuariosVerificar_(actorUsuario, actorPassword);
  if(!actor) throw new Error('Credenciales inválidas.');
  if(actor.rol !== 'calidad') throw new Error('No tenés permiso para esta acción (es solo para Calidad).');
  return actor;
}

function svcUsuariosListar_(actorUsuario, actorPassword){
  try{
    requiereCalidadGC_(actorUsuario, actorPassword);
  }catch(err){ return responseError_(err.message||err); }
  var lista = dbUsuariosListar_().map(function(u){
    return {nombre:u.nombre, usuario:u.usuario, rol:u.rol, sector:u.sector, email:u.email, activo:u.activo};
  });
  return responseOk_({usuarios: lista});
}

function svcUsuarioCrear_(actorUsuario, actorPassword, datos){
  try{
    requiereCalidadGC_(actorUsuario, actorPassword);
  }catch(err){ return responseError_(err.message||err); }
  if(!datos.nombre || !datos.usuario || !datos.password) return responseError_('Faltan datos (nombre, usuario o contraseña).');
  if(ROLES_VALIDOS_GC_.indexOf(datos.rol)===-1) return responseError_('Rol inválido. Debe ser: '+ROLES_VALIDOS_GC_.join(', '));
  if(String(datos.password).length<4) return responseError_('La contraseña es muy corta.');
  if(dbUsuariosBuscar_(datos.usuario)) return responseError_('Ya existe un usuario con ese nombre de usuario.');
  dbUsuariosCrear_(datos);
  return responseOk_({});
}

function svcUsuarioEditar_(actorUsuario, actorPassword, usuarioObjetivo, cambios){
  try{
    requiereCalidadGC_(actorUsuario, actorPassword);
  }catch(err){ return responseError_(err.message||err); }
  if(cambios.rol && ROLES_VALIDOS_GC_.indexOf(cambios.rol)===-1) return responseError_('Rol inválido.');
  var ok = dbUsuariosEditar_(usuarioObjetivo, cambios);
  return ok ? responseOk_({}) : responseError_('No se encontró ese usuario.');
}

function svcUsuarioDesactivar_(actorUsuario, actorPassword, usuarioObjetivo, activo){
  try{
    requiereCalidadGC_(actorUsuario, actorPassword);
  }catch(err){ return responseError_(err.message||err); }
  if(String(usuarioObjetivo).trim().toLowerCase()===String(actorUsuario).trim().toLowerCase() && activo===false){
    return responseError_('No te podés desactivar a vos mismo.');
  }
  var ok = dbUsuariosDesactivar_(usuarioObjetivo, activo);
  return ok ? responseOk_({}) : responseError_('No se encontró ese usuario.');
}

// Lista simple de usuarios activos, para poblar el selector de "Asignar a"
// en el detalle del caso — sin requerir credenciales de Calidad, cualquier
// usuario logueado puede ver a quién se le puede asignar un caso.
function svcUsuariosActivosParaAsignar_(){
  var lista = dbUsuariosListar_().filter(function(u){ return u.activo; })
    .map(function(u){ return {nombre:u.nombre, usuario:u.usuario, rol:u.rol, sector:u.sector}; });
  return responseOk_({usuarios: lista});
}

// Importación rápida de nombres (ej: copiados de Planning u otra lista) —
// crea usuarios INACTIVOS, sin acceso todavía, para no tener que tipear cada
// nombre a mano al armar el equipo. Se activan uno por uno desde Equipo
// cuando corresponda darles acceso real (con su propia contraseña).
function svcUsuariosImportarLista_(actorUsuario, actorPassword, nombres){
  try{
    requiereCalidadGC_(actorUsuario, actorPassword);
  }catch(err){ return responseError_(err.message||err); }
  var creados = [], omitidos = [];
  (nombres||[]).forEach(function(linea){
    var partes = String(linea).split(',').map(function(s){return s.trim();});
    var nombre = partes[0]; var sector = partes[1]||'';
    if(!nombre) return;
    var usuarioBase = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'');
    var usuario = usuarioBase, sufijo = 1;
    while(dbUsuariosBuscar_(usuario)){ usuario = usuarioBase+sufijo; sufijo++; }
    if(!usuarioBase){ omitidos.push(nombre); return; }
    dbUsuariosCrear_({nombre:nombre, usuario:usuario, password:Utilities.getUuid(), rol:'sector', sector:sector, email:''});
    dbUsuariosDesactivar_(usuario, false); // queda inactivo — "sin acceso todavía"
    creados.push({nombre:nombre, usuario:usuario});
  });
  return responseOk_({creados: creados, omitidos: omitidos});
}
