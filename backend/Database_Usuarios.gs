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

function dbUsuariosVerificar_(usuario, password){
  var u = dbUsuariosBuscar_(usuario);
  if(!u || !u.activo) return null;
  var hash = hashPassword_GC(password, u.salt);
  return hash===u.passwordHash ? u : null;
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
