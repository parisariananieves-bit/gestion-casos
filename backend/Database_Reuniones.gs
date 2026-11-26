/**
 * Database_Reuniones.gs
 * Hoja "Reuniones": reuniones semanales recurrentes de casos (por unidad de
 * negocio y sucursal). Una fila = una reunión que se repite todas las semanas.
 */
function getHojaReuniones_(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.REUNIONES);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.REUNIONES);
    var headers = COLUMNAS_REUNIONES.map(function(c){return c.h;});
    hoja.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#7C3AED').setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  }
  return hoja;
}
function reunionRowToObj_(row){
  var o = {};
  COLUMNAS_REUNIONES.forEach(function(c,i){ o[c.k] = row[i]; });
  o.activo = (o.activo===true || o.activo==='true' || o.activo==='TRUE');
  o.diaSemana = Number(o.diaSemana) || 0;
  // Sheets convierte "10:00" en fecha: lo devolvemos siempre como texto HH:mm
  if(o.hora instanceof Date) o.hora = Utilities.formatDate(o.hora, Session.getScriptTimeZone(), 'HH:mm');
  o.hora = String(o.hora||'');
  return o;
}
function dbReunionesListar_(){
  var hoja = getHojaReuniones_(), last = hoja.getLastRow();
  if(last<2) return [];
  return hoja.getRange(2,1,last-1,COLUMNAS_REUNIONES.length).getValues().filter(function(r){ return r[0]; }).map(reunionRowToObj_);
}
function dbReunionesFila_(id){
  var hoja = getHojaReuniones_(), last = hoja.getLastRow();
  if(last<2) return -1;
  var ids = hoja.getRange(2,1,last-1,1).getValues();
  for(var i=0;i<ids.length;i++){ if(String(ids[i][0])===String(id)) return i+2; }
  return -1;
}
function dbReunionesGuardar_(obj){
  var hoja = getHojaReuniones_(), fila = dbReunionesFila_(obj.id);
  var row = COLUMNAS_REUNIONES.map(function(c){ var v = obj[c.k]; return (v===undefined||v===null)?'':v; });
  // La hora va como texto para que Sheets no la convierta en fecha
  var colHora = COLUMNAS_REUNIONES.findIndex(function(c){ return c.k==='hora'; });
  if(fila===-1){ hoja.appendRow(row); fila = hoja.getLastRow(); }
  else hoja.getRange(fila,1,1,row.length).setValues([row]);
  hoja.getRange(fila, colHora+1).setNumberFormat('@').setValue(String(obj.hora||''));
  return obj.id;
}
function dbReunionesEliminar_(id){
  var fila = dbReunionesFila_(id);
  if(fila===-1) return false;
  getHojaReuniones_().deleteRow(fila);
  return true;
}
