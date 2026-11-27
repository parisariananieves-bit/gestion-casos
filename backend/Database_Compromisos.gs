/**
 * Database_Compromisos.gs
 * Hoja "Compromisos" (Etapa 5) — un compromiso por cada caso tratado en una
 * minuta de reunión. No es una base de datos paralela: es exactamente el
 * mismo patrón que ya usa Seguimientos (historial dentro de un caso) o
 * Timeline (historial por VIN), ahora aplicado a "qué se decidió sobre
 * este caso en esta reunión, y quién se comprometió a qué".
 */

function getHojaCompromisos_(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.COMPROMISOS);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.COMPROMISOS);
    var headers = COLUMNAS_COMPROMISOS.map(function(c){return c.h;});
    hoja.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold')
      .setBackground('#7C3AED').setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function compromisoRowToObj_(row){
  var obj = {};
  COLUMNAS_COMPROMISOS.forEach(function(c,i){ obj[c.k] = row[i]; });
  return obj;
}

function dbCompromisosAgregar_(obj){
  var hoja = getHojaCompromisos_();
  hoja.appendRow(COLUMNAS_COMPROMISOS.map(function(c){
    var v = obj[c.k];
    return (v===undefined || v===null) ? '' : v;
  }));
  return obj.id;
}

function dbCompromisosListarTodos_(){
  var hoja = getHojaCompromisos_();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return [];
  var datos = hoja.getRange(2,1,lastRow-1,COLUMNAS_COMPROMISOS.length).getValues();
  return datos.filter(function(r){return r[0];}).map(compromisoRowToObj_);
}

function dbCompromisosPorActa_(actaId){
  return dbCompromisosListarTodos_().filter(function(c){ return String(c.actaId)===String(actaId); });
}

function dbCompromisosPorCaso_(casoId){
  return dbCompromisosListarTodos_().filter(function(c){ return String(c.casoId)===String(casoId); });
}

function dbCompromisoFilaPorId_(id){
  var hoja = getHojaCompromisos_();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return -1;
  var ids = hoja.getRange(2,1,lastRow-1,1).getValues();
  for(var i=0;i<ids.length;i++){ if(String(ids[i][0])===String(id)) return i+2; }
  return -1;
}

function dbCompromisoActualizarCampos_(id, campos){
  var idx = dbCompromisoFilaPorId_(id);
  if(idx===-1) return false;
  var hoja = getHojaCompromisos_();
  Object.keys(campos).forEach(function(k){
    var colIdx = COLUMNAS_COMPROMISOS.findIndex(function(c){return c.k===k;});
    if(colIdx>-1) hoja.getRange(idx, colIdx+1).setValue(campos[k]);
  });
  return true;
}

function dbCompromisoEliminar_(id){
  var idx = dbCompromisoFilaPorId_(id);
  if(idx===-1) return false;
  getHojaCompromisos_().deleteRow(idx);
  return true;
}
