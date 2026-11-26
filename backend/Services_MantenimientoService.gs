/**
 * Services_MantenimientoService.gs
 * Orden y respaldo de la planilla:
 *  - Archivar casos cerrados hace mucho (se pasan a la hoja "Casos_Archivo"
 *    con sus novedades en "Seguimientos_Archivo"; no se borran del todo).
 *  - Respaldo: copia de toda la planilla en una carpeta de Drive.
 * Todo se puede correr a mano desde la app (Configuración → Mantenimiento) o
 * desde el editor de Apps Script (archivarCasosViejos, respaldarAhora).
 */

var HOJA_CASOS_ARCHIVO_ = 'Casos_Archivo';
var HOJA_SEGUIMIENTOS_ARCHIVO_ = 'Seguimientos_Archivo';
var CARPETA_RESPALDOS_ = 'Respaldos Gestión de Casos';
var RESPALDOS_A_CONSERVAR_ = 8;

function svcMantenimientoAutorizar_(params){
  var u = params && params.actorUsuario ? dbUsuariosVerificar_(params.actorUsuario, params.actorPassword) : null;
  if(!u || u.rol!=='calidad') return null;
  return u;
}

function hojaArchivo_(nombre, headersFuente){
  var ss = getSS_GC(), hoja = ss.getSheetByName(nombre);
  if(!hoja){
    hoja = ss.insertSheet(nombre);
    hoja.getRange(1,1,1,headersFuente.length).setValues([headersFuente]).setFontWeight('bold').setBackground('#0C0D10').setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// Cuenta cuántos casos se archivarían (sin tocar nada).
function svcArchivoContar_(meses){
  return svcArchivoCandidatos_(meses).length;
}
function svcArchivoCandidatos_(meses){
  var limite = new Date(); limite.setMonth(limite.getMonth() - (Number(meses)||6));
  return dbCasosListarTodos_().filter(function(c){
    if(c.estado!=='cerrado' && c.estado!=='resuelto') return false;
    var f = utilFechaMs_(c.cerradoFecha || c.fechaUltimaActualizacion);
    return f && f < limite.getTime();
  });
}

function svcArchivarCasosViejos_(meses){
  var cand = svcArchivoCandidatos_(meses);
  if(!cand.length) return {ok:true, archivados:0};
  var ids = {}; cand.forEach(function(c){ ids[String(c.id)] = true; });

  // 1) copiar a archivo
  var hojaC = getHojaCasos_GC();
  var hojaCA = hojaArchivo_(HOJA_CASOS_ARCHIVO_, COLUMNAS_CASOS.map(function(c){ return c.h; }));
  var filasC = cand.map(casoObjToRow_);
  hojaCA.getRange(hojaCA.getLastRow()+1, 1, filasC.length, COLUMNAS_CASOS.length).setValues(filasC);

  // 2) novedades de esos casos
  var hs = getHojaSeguimientos_(), lastS = hs.getLastRow();
  if(lastS>=2){
    var nCols = hs.getLastColumn();
    var datos = hs.getRange(2,1,lastS-1,nCols).getValues();
    var hojaSA = hojaArchivo_(HOJA_SEGUIMIENTOS_ARCHIVO_, hs.getRange(1,1,1,nCols).getValues()[0]);
    var paraArchivar = datos.filter(function(r){ return ids[String(r[1])]; });
    if(paraArchivar.length) hojaSA.getRange(hojaSA.getLastRow()+1, 1, paraArchivar.length, nCols).setValues(paraArchivar);
    for(var i=datos.length-1;i>=0;i--){ if(ids[String(datos[i][1])]) hs.deleteRow(i+2); }
  }

  // 3) sacar de la hoja principal (de abajo hacia arriba para no correr filas)
  var lastC = hojaC.getLastRow();
  if(lastC>=2){
    var idsCol = hojaC.getRange(2,1,lastC-1,1).getValues();
    for(var j=idsCol.length-1;j>=0;j--){ if(ids[String(idsCol[j][0])]) hojaC.deleteRow(j+2); }
  }
  return {ok:true, archivados:cand.length};
}

function svcRespaldarPlanilla_(){
  var ss = getSS_GC();
  var carpetas = DriveApp.getFoldersByName(CARPETA_RESPALDOS_);
  var carpeta = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder(CARPETA_RESPALDOS_);
  var fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  var copia = DriveApp.getFileById(ss.getId()).makeCopy('Respaldo Gestión de Casos — '+fecha, carpeta);
  // Conserva solo los últimos N respaldos
  var archivos = [], it = carpeta.getFiles();
  while(it.hasNext()){ var f = it.next(); archivos.push({f:f, t:f.getDateCreated().getTime()}); }
  archivos.sort(function(a,b){ return b.t - a.t; });
  archivos.slice(RESPALDOS_A_CONSERVAR_).forEach(function(x){ x.f.setTrashed(true); });
  return {ok:true, nombre:copia.getName(), url:copia.getUrl(), carpeta:carpeta.getUrl()};
}

// --- Para correr a mano desde el editor de Apps Script ---
function archivarCasosViejos(){ var r = svcArchivarCasosViejos_(6); Logger.log('Casos archivados: '+r.archivados); return r; }
function respaldarAhora(){ var r = svcRespaldarPlanilla_(); Logger.log(r.url); return r; }
// OPCIONAL: respaldo automático semanal (domingos de madrugada). Correrla una sola vez.
function instalarRespaldoSemanal(){
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction()==='respaldarAhora') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('respaldarAhora').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).create();
}
