/**
 * Database_Actas.gs
 * Hoja "Actas" — minutas de reunión, con casos vinculados opcionales.
 */

function getHojaActas_(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.ACTAS);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.ACTAS);
    var headers = COLUMNAS_ACTAS.map(function(c){return c.h;});
    hoja.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold')
      .setBackground('#7C3AED').setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function actaRowToObj_(row){
  var obj = {};
  COLUMNAS_ACTAS.forEach(function(c,i){ obj[c.k]=row[i]; });
  obj.casosVinculados = obj.casosVinculados ? String(obj.casosVinculados).split(',').map(function(s){return s.trim();}).filter(Boolean) : [];
  return obj;
}

function dbActasListar_(){
  var hoja = getHojaActas_();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return [];
  var datos = hoja.getRange(2,1,lastRow-1,COLUMNAS_ACTAS.length).getValues();
  return datos.filter(function(r){return r[0];}).map(actaRowToObj_)
    .sort(function(a,b){ return new Date(b.fecha) - new Date(a.fecha); });
}

function dbActaCrear_(obj){
  var hoja = getHojaActas_();
  hoja.appendRow(COLUMNAS_ACTAS.map(function(c){
    if(c.k==='casosVinculados') return (obj.casosVinculados||[]).join(', ');
    var v = obj[c.k];
    return (v===undefined||v===null) ? '' : v;
  }));
  return obj.id;
}
