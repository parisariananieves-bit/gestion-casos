/**
 * Database_Seguimientos.gs
 * Hoja "Seguimientos": novedades DENTRO de un caso puntual — comentarios,
 * cambios de estado, asignaciones, respuestas del cliente. Es lo que arma
 * el timeline que se ve en el detalle de un caso ("Novedades").
 */

function getHojaSeguimientos_(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.SEGUIMIENTOS);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.SEGUIMIENTOS);
    var headers = COLUMNAS_SEGUIMIENTOS.map(function(c){return c.h;});
    hoja.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold')
      .setBackground('#0F9D58').setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function seguimientoRowToObj_(row){
  var obj = {};
  COLUMNAS_SEGUIMIENTOS.forEach(function(c,i){ obj[c.k] = row[i]; });
  COLUMNAS_SEGUIMIENTOS.forEach(function(c){ if(c.bool) obj[c.k] = (obj[c.k]===true || obj[c.k]==='true'); });
  return obj;
}

function dbSeguimientosAgregar_(obj){
  var hoja = getHojaSeguimientos_();
  hoja.appendRow(COLUMNAS_SEGUIMIENTOS.map(function(c){
    var v = obj[c.k];
    return (v===undefined || v===null) ? '' : v;
  }));
  return obj.id;
}

function dbSeguimientosPorCaso_(casoId){
  var hoja = getHojaSeguimientos_();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return [];
  var datos = hoja.getRange(2,1,lastRow-1,COLUMNAS_SEGUIMIENTOS.length).getValues();
  return datos.filter(function(r){ return r[0] && String(r[1])===String(casoId); })
    .map(seguimientoRowToObj_)
    .sort(function(a,b){ return new Date(a.fecha) - new Date(b.fecha); });
}
