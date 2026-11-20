/**
 * Database_Timeline.gs
 * Hoja "Timeline": historial a nivel VEHÍCULO (por VIN/patente), legible en
 * una sola consulta — cruza TODOS los casos y eventos relevantes de ese auto,
 * a diferencia de Seguimientos que es historial DENTRO de un caso puntual.
 *
 * Ejemplo de uso: un asesor de ventas escanea/tipea un VIN y ve de una toda
 * la vida del auto en el sistema, sin importar en qué caso ocurrió cada cosa.
 */

function getHojaTimeline_(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.TIMELINE);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.TIMELINE);
    var headers = COLUMNAS_TIMELINE.map(function(c){return c.h;});
    hoja.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold')
      .setBackground('#0EA5E9').setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function timelineRowToObj_(row){
  var obj = {};
  COLUMNAS_TIMELINE.forEach(function(c,i){ obj[c.k] = row[i]; });
  return obj;
}

function dbTimelineAgregar_(obj){
  var hoja = getHojaTimeline_();
  hoja.appendRow(COLUMNAS_TIMELINE.map(function(c){
    var v = obj[c.k];
    return (v===undefined || v===null) ? '' : v;
  }));
  return obj.id;
}

function dbTimelinePorVin_(vin){
  if(!vin) return [];
  var vinNorm = String(vin).trim().toUpperCase();
  var hoja = getHojaTimeline_();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return [];
  var datos = hoja.getRange(2,1,lastRow-1,COLUMNAS_TIMELINE.length).getValues();
  return datos.filter(function(r){ return r[0] && String(r[1]).trim().toUpperCase()===vinNorm; })
    .map(timelineRowToObj_)
    .sort(function(a,b){ return new Date(b.fecha) - new Date(a.fecha); });
}
