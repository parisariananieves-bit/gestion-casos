/**
 * Database_Eventos.gs
 * Acceso a la hoja "Eventos" — todo lo que entra al sistema (Manual, Planning,
 * NPS, WhatsApp, Mail...) se guarda ACÁ primero, tal cual llegó, antes de que
 * el Motor de Eventos (Engine_EventEngine.gs) decida qué hacer con eso.
 * Nada se pierde: si el motor descarta o falla, el evento crudo queda.
 */

function getHojaEventos_(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.EVENTOS);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.EVENTOS);
    var headers = COLUMNAS_EVENTOS.map(function(c){return c.h;});
    hoja.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold')
      .setBackground('#7C3AED').setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function eventoRowToObj_(row){
  var obj = {};
  COLUMNAS_EVENTOS.forEach(function(c,i){ obj[c.k] = row[i]; });
  COLUMNAS_EVENTOS.forEach(function(c){ if(c.bool) obj[c.k] = (obj[c.k]===true || obj[c.k]==='true'); });
  try{ obj.payloadOriginal = obj.payloadOriginal ? JSON.parse(obj.payloadOriginal) : {}; }catch(e){}
  try{ obj.datosNormalizados = obj.datosNormalizados ? JSON.parse(obj.datosNormalizados) : {}; }catch(e){}
  return obj;
}
function eventoObjToRow_(obj){
  return COLUMNAS_EVENTOS.map(function(c){
    if(c.k==='payloadOriginal') return JSON.stringify(obj.payloadOriginal||{});
    if(c.k==='datosNormalizados') return JSON.stringify(obj.datosNormalizados||{});
    var v = obj[c.k];
    return (v===undefined || v===null) ? '' : v;
  });
}

function dbEventosCrear_(obj){
  var hoja = getHojaEventos_();
  hoja.appendRow(eventoObjToRow_(obj));
  return obj.id;
}

function dbEventosListarTodos_(){
  var hoja = getHojaEventos_();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return [];
  var datos = hoja.getRange(2,1,lastRow-1,COLUMNAS_EVENTOS.length).getValues();
  return datos.filter(function(r){return r[0];}).map(eventoRowToObj_);
}

function dbEventosListarSinProcesar_(){
  return dbEventosListarTodos_().filter(function(e){ return !e.procesado; });
}

function dbEventosMarcarProcesado_(id, casoGenerado, motivoDescarte){
  var hoja = getHojaEventos_();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return false;
  var ids = hoja.getRange(2,1,lastRow-1,1).getValues();
  for(var i=0;i<ids.length;i++){
    if(String(ids[i][0])===String(id)){
      var fila = i+2;
      var colProcesado = COLUMNAS_EVENTOS.findIndex(function(c){return c.k==='procesado';})+1;
      var colCaso = COLUMNAS_EVENTOS.findIndex(function(c){return c.k==='casoGenerado';})+1;
      var colMotivo = COLUMNAS_EVENTOS.findIndex(function(c){return c.k==='motivoDescarte';})+1;
      hoja.getRange(fila, colProcesado).setValue(true);
      if(casoGenerado) hoja.getRange(fila, colCaso).setValue(casoGenerado);
      if(motivoDescarte) hoja.getRange(fila, colMotivo).setValue(motivoDescarte);
      return true;
    }
  }
  return false;
}

// Detecta duplicados exactos por hash (mismo payload recibido dos veces,
// ej. un doble submit del formulario). No es la coincidencia "inteligente"
// por DNI/VIN/nombre — esa vive en Engine_ReglasEvaluator.gs.
function dbEventosBuscarPorHash_(hash){
  if(!hash) return null;
  return dbEventosListarTodos_().find(function(e){ return e.hashEvento===hash; }) || null;
}
