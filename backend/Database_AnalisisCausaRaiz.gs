/**
 * Database_AnalisisCausaRaiz.gs
 * Hoja "AnalisisCausaRaiz" — método de los 5 Porqués aplicado a un caso.
 * Un análisis por caso (se pisa/actualiza si ya existía uno, no se acumulan
 * versiones — si en el futuro hace falta historial de versiones, se agrega
 * ahí solo, sin romper esto).
 */

function getHojaAnalisisCausaRaiz_(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.ANALISIS_CAUSA_RAIZ);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.ANALISIS_CAUSA_RAIZ);
    var headers = COLUMNAS_ANALISIS_CAUSA_RAIZ.map(function(c){return c.h;});
    hoja.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold')
      .setBackground('#0EA5E9').setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function analisisRowToObj_(row){
  var obj = {};
  COLUMNAS_ANALISIS_CAUSA_RAIZ.forEach(function(c,i){ obj[c.k]=row[i]; });
  return obj;
}

function dbAnalisisBuscarPorCaso_(casoId){
  var hoja = getHojaAnalisisCausaRaiz_();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return null;
  var datos = hoja.getRange(2,1,lastRow-1,COLUMNAS_ANALISIS_CAUSA_RAIZ.length).getValues();
  for(var i=0;i<datos.length;i++){
    if(String(datos[i][1])===String(casoId)) return {fila:i+2, obj:analisisRowToObj_(datos[i])};
  }
  return null;
}

function dbAnalisisGuardar_(casoId, datos){
  var existente = dbAnalisisBuscarPorCaso_(casoId);
  var hoja = getHojaAnalisisCausaRaiz_();
  var fila = existente ? [existente.obj.id] : [utilNuevoIdAnalisis_()];
  var completa = fila.concat([
    casoId, utilAhoraTexto_(), datos.autor||'', datos.problema||'',
    datos.porque1||'', datos.porque2||'', datos.porque3||'', datos.porque4||'', datos.porque5||'',
    datos.causaRaiz||'', datos.planAccion||'', datos.responsablePlan||'', datos.fechaLimitePlan||'',
    datos.estadoPlan||'pendiente'
  ]);
  if(existente){
    hoja.getRange(existente.fila, 1, 1, COLUMNAS_ANALISIS_CAUSA_RAIZ.length).setValues([completa]);
  } else {
    hoja.appendRow(completa);
  }
  return completa[0];
}
