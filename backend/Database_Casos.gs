/**
 * Database_Casos.gs
 * Acceso a la hoja "Casos" — la tabla central del sistema. Esta capa NO
 * decide nada (eso es trabajo del Engine y los Services), solo lee/escribe.
 */

function getHojaCasos_GC(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.CASOS);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.CASOS);
    var headers = COLUMNAS_CASOS.map(function(c){return c.h;});
    hoja.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold')
      .setBackground('#0C0D10').setFontColor('#FFFFFF');
    hoja.setFrozenRows(1);
  } else {
    // Hojas ya existentes: si se agregaron columnas nuevas al final de
    // COLUMNAS_CASOS, les pone el encabezado que falta (no toca datos).
    try{
      var n = COLUMNAS_CASOS.length;
      if(hoja.getMaxColumns() < n) hoja.insertColumnsAfter(hoja.getMaxColumns(), n - hoja.getMaxColumns());
      var enc = hoja.getRange(1,1,1,n).getValues()[0];
      for(var i=0;i<n;i++){
        if(!enc[i]) hoja.getRange(1,i+1).setValue(COLUMNAS_CASOS[i].h).setFontWeight('bold').setBackground('#0C0D10').setFontColor('#FFFFFF');
      }
    }catch(e){}
  }
  return hoja;
}

function casoRowToObj_(row){
  var obj = {};
  COLUMNAS_CASOS.forEach(function(c,i){ obj[c.k] = row[i]; });
  COLUMNAS_CASOS.forEach(function(c){ if(c.bool) obj[c.k] = (obj[c.k]===true || obj[c.k]==='true'); });
  return obj;
}
function casoObjToRow_(obj){
  return COLUMNAS_CASOS.map(function(c){
    var v = obj[c.k];
    return (v===undefined || v===null) ? '' : v;
  });
}

function dbCasosListarTodos_(){
  var hoja = getHojaCasos_GC();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return [];
  var datos = hoja.getRange(2,1,lastRow-1,COLUMNAS_CASOS.length).getValues();
  return datos.filter(function(r){return r[0];}).map(casoRowToObj_);
}

function dbCasosBuscarPorId_(id){
  var hoja = getHojaCasos_GC();
  var idx = dbCasosFilaPorId_(id);
  if(idx===-1) return null;
  var row = hoja.getRange(idx,1,1,COLUMNAS_CASOS.length).getValues()[0];
  return casoRowToObj_(row);
}

function dbCasosFilaPorId_(id){
  var hoja = getHojaCasos_GC();
  var lastRow = hoja.getLastRow();
  if(lastRow<2) return -1;
  var ids = hoja.getRange(2,1,lastRow-1,1).getValues();
  for(var i=0;i<ids.length;i++){
    if(String(ids[i][0])===String(id)) return i+2;
  }
  return -1;
}

function dbCasosCrear_(obj){
  var hoja = getHojaCasos_GC();
  hoja.appendRow(casoObjToRow_(obj));
  return obj.id;
}

function dbCasosActualizarCampos_(id, campos){
  var idx = dbCasosFilaPorId_(id);
  if(idx===-1) return false;
  var hoja = getHojaCasos_GC();
  Object.keys(campos).forEach(function(k){
    var colIdx = -1;
    for(var i=0;i<COLUMNAS_CASOS.length;i++){ if(COLUMNAS_CASOS[i].k===k){ colIdx=i; break; } }
    if(colIdx>-1) hoja.getRange(idx, colIdx+1).setValue(campos[k]);
  });
  // Toda escritura toca la fecha de última actualización, salvo que ya
  // viniera explícita en los campos (para no pisarla en migraciones, etc.)
  if(!campos.fechaUltimaActualizacion){
    var colFecha = COLUMNAS_CASOS.findIndex(function(c){return c.k==='fechaUltimaActualizacion';});
    hoja.getRange(idx, colFecha+1).setValue(new Date());
  }
  return true;
}

function dbCasosBuscarPorVin_(vin){
  if(!vin) return [];
  var vinNorm = String(vin).trim().toUpperCase();
  return dbCasosListarTodos_().filter(function(c){
    return String(c.dominio||'').trim().toUpperCase() === vinNorm;
  });
}

function dbCasosBuscarPorCliente_(nombreOTelOEmail){
  var q = String(nombreOTelOEmail||'').trim().toLowerCase();
  if(!q) return [];
  return dbCasosListarTodos_().filter(function(c){
    return String(c.cliente||'').toLowerCase().indexOf(q)>-1 ||
           String(c.telefono||'').indexOf(q)>-1 ||
           String(c.email||'').toLowerCase()===q ||
           String(c.dni||'')===q;
  });
}

// Borra el caso (fila) y todas sus novedades. No se puede deshacer.
function dbCasosEliminar_(id){
  var fila = dbCasosFilaPorId_(id);
  if(fila===-1) return false;
  getHojaCasos_GC().deleteRow(fila);
  var hs = getHojaSeguimientos_(), last = hs.getLastRow();
  if(last>=2){
    var ids = hs.getRange(2,2,last-1,1).getValues();
    for(var i=ids.length-1;i>=0;i--){ if(String(ids[i][0])===String(id)) hs.deleteRow(i+2); }
  }
  return true;
}
