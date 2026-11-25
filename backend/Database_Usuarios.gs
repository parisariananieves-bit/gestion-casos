/**
 * Database_Usuarios.gs
 * Login básico — mismo criterio de hash+salt que ya usa Planning de Entregas,
 * para no reinventar nada. Roles pensados para esta etapa:
 *   'calidad'   -> acceso total (Bandeja, Mis Casos, Kanban, Configuración)
 *   'sector'    -> solo ve y comenta los casos que reportó su sector
 *   'referente' -> ve el estado de los casos de su sector, sin poder gestionarlos
 */

function getHojaUsuarios_GC(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.USUARIOS);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.USUARIOS);
    var headers = COLUMNAS_USUARIOS.map(function(c){return c.h;});
    hoja.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
    hoja.setFrozenRows(1);
    // Bootstrap: usuario inicial para poder entrar la primera vez.
    // Usuario: admin / Contraseña: Calidad2026 (cambiarla enseguida).
    var salt = Utilities.getUuid();
    var hash = hashPassword_GC('Calidad2026', salt);
    hoja.appendRow(['Administrador','admin',hash,salt,'calidad','Calidad','',true]);
  }
  return hoja;
}

function hashPassword_GC(password, salt){
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password)+'|'+String(salt));
  return raw.map(function(b){ var v=(b<0?b+256:b).toString(16); return v.length===1?'0'+v:v; }).join('');
}

function dbUsuariosListar_(){
  var hoja = getHojaUsuarios_GC();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return [];
  var datos = hoja.getRange(2,1,lastRow-1,COLUMNAS_USUARIOS.length).getValues();
  return datos.filter(function(r){return r[0];}).map(function(r,i){
    var obj = {}; COLUMNAS_USUARIOS.forEach(function(c,j){ obj[c.k]=r[j]; });
    obj.fila = i+2;
    obj.activo = (obj.activo===true || obj.activo==='true');
    return obj;
  });
}

function dbUsuariosBuscar_(usuario){
  var u = String(usuario||'').trim().toLowerCase();
  return dbUsuariosListar_().find(function(x){ return String(x.usuario).trim().toLowerCase()===u; }) || null;
}

// Login con las MISMAS credenciales que el Planning de Entregas.
// 1) Se prueba primero con los usuarios de esta planilla (rápido).
// 2) Si no coincide y hay ID_PLANNING_USUARIOS configurado (Config.gs), se
//    prueba contra la hoja "Usuarios" del Planning (mismo hash SHA-256+salt).
//    Si coincide, se crea/actualiza la persona acá (conserva el rol que ya
//    tenía en Gestión de Casos) para que aparezca en Equipo, en las
//    asignaciones y en los mails.
function dbUsuariosVerificar_(usuario, password){
  var local = dbUsuariosVerificarLocal_(usuario, password);
  if(local) return local;
  return dbUsuariosVerificarPlanning_(usuario, password);
}

function dbUsuariosVerificarLocal_(usuario, password){
  var u = dbUsuariosBuscar_(usuario);
  if(!u || !u.activo) return null;
  var hash = hashPassword_GC(password, u.salt);
  return hash===u.passwordHash ? u : null;
}

function dbUsuariosVerificarPlanning_(usuario, password){
  try{
    if(typeof ID_PLANNING_USUARIOS === 'undefined' || !ID_PLANNING_USUARIOS) return null;
    var hojaP = SpreadsheetApp.openById(ID_PLANNING_USUARIOS).getSheetByName('Usuarios');
    if(!hojaP || hojaP.getLastRow()<2) return null;
    var ident = String(usuario||'').trim().toLowerCase();
    var filas = hojaP.getRange(2,1,hojaP.getLastRow()-1,14).getValues();
    // Columnas de Planning: 0 Nombre, 1 Usuario, 2 Hash, 3 Salt, 4 Rol, 5 Activo, 8 Email, 13 Sector
    var f = filas.filter(function(r){
      return String(r[1]||'').trim().toLowerCase()===ident || (r[8] && String(r[8]).trim().toLowerCase()===ident);
    })[0];
    if(!f) return null;
    var activo = (f[5]===true || f[5]==='TRUE' || f[5]===1);
    if(!activo) return null;
    if(hashPassword_GC(password, f[3]) !== f[2]) return null;

    var usuarioNorm = String(f[1]||'').trim().toLowerCase();
    var existente = dbUsuariosBuscar_(usuarioNorm);
    var hoja = getHojaUsuarios_GC();
    if(existente){
      hoja.getRange(existente.fila, 3, 1, 2).setValues([[f[2], f[3]]]);   // hash y salt al día
      hoja.getRange(existente.fila, 8).setValue(true);
      if(!existente.email && f[8]) hoja.getRange(existente.fila, 7).setValue(f[8]);
    } else {
      var rolP = String(f[4]||'').toLowerCase();
      var rol = (rolP==='calidad' || rolP==='maestro') ? 'calidad' : 'sector';
      hoja.appendRow([f[0], usuarioNorm, f[2], f[3], rol, f[13]||'', f[8]||'', true]);
    }
    return dbUsuariosBuscar_(usuarioNorm);
  }catch(err){
    return null; // si Planning no se puede leer, el login local sigue funcionando
  }
}

function dbUsuariosCrear_(datos){
  var hoja = getHojaUsuarios_GC();
  var salt = Utilities.getUuid();
  var hash = hashPassword_GC(datos.password, salt);
  hoja.appendRow([datos.nombre, String(datos.usuario).trim().toLowerCase(), hash, salt, datos.rol, datos.sector||'', datos.email||'', true]);
}

function dbUsuariosEditar_(usuarioLogin, cambios){
  var u = dbUsuariosBuscar_(usuarioLogin);
  if(!u) return false;
  var hoja = getHojaUsuarios_GC();
  var mapaColumnas = {};
  COLUMNAS_USUARIOS.forEach(function(c,i){ mapaColumnas[c.k]=i+1; });
  Object.keys(cambios).forEach(function(k){
    if(mapaColumnas[k]) hoja.getRange(u.fila, mapaColumnas[k]).setValue(cambios[k]);
  });
  return true;
}

function dbUsuariosDesactivar_(usuarioLogin, activo){
  var u = dbUsuariosBuscar_(usuarioLogin);
  if(!u) return false;
  var hoja = getHojaUsuarios_GC();
  hoja.getRange(u.fila, 8).setValue(activo!==false); // columna Activo
  return true;
}
