/**
 * Database_Catalogos.gs
 * Hoja "Catalogos": listas desplegables editables desde la planilla (o desde
 * la web más adelante) sin tocar código — sectores, tipos de caso, marcas,
 * sucursales, prioridades, estados.
 *
 * Estructura: una columna por catálogo, encabezado = nombre del catálogo.
 */

var CATALOGOS_DEFAULT_ = {
  'Sector': ['Ventas','Administración','BDC','Caja','Taller','Postventa','Recepción','RRHH','Calidad'],
  'Tipo de Caso': ['Reclamo de cliente','Demora de entrega','Falla técnica','Facturación','Consulta interna','Otro'],
  'Unidad de Negocio': ['Venta Directa','Plan de Ahorro','Postventa / CSI','Venta'],
  'Marca': ['Chevrolet','Peugeot','Citroën','Honda','DFSK / Jetour','Usados'],
  'Sucursal': ['San Luis','San Juan','Villa Mercedes','Merlo'],
  'Prioridad': ['Alta','Media','Baja'],
  'Estado': ['nuevo','analisis','esperando','derivado','resuelto','cerrado'],
  'Fuente': ['Manual','Automático','Planning','NPS','Mini encuesta','WhatsApp','Mail']
};

function getHojaCatalogos_(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.CATALOGOS);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.CATALOGOS);
    var nombres = Object.keys(CATALOGOS_DEFAULT_);
    hoja.getRange(1,1,1,nombres.length).setValues([nombres]).setFontWeight('bold');
    nombres.forEach(function(nombre, col){
      var valores = CATALOGOS_DEFAULT_[nombre];
      if(valores.length){
        hoja.getRange(2, col+1, valores.length, 1).setValues(valores.map(function(v){return [v];}));
      }
    });
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function dbCatalogosLeerTodo_(){
  var hoja = getHojaCatalogos_();
  var datos = hoja.getDataRange().getValues();
  if(datos.length===0) return {};
  var encabezados = datos[0];
  var out = {};
  encabezados.forEach(function(nombre, col){
    if(!nombre) return;
    var valores = [];
    for(var f=1; f<datos.length; f++){
      var v = datos[f][col];
      if(v!=='' && v!==null && v!==undefined) valores.push(v);
    }
    out[nombre] = valores;
  });
  return out;
}

function dbCatalogoLeer_(nombre){
  var todos = dbCatalogosLeerTodo_();
  return todos[nombre] || [];
}

function dbCatalogoAgregarItem_(nombre, valor){
  var hoja = getHojaCatalogos_();
  var encabezados = hoja.getRange(1,1,1,Math.max(hoja.getLastColumn(),1)).getValues()[0];
  var col = encabezados.indexOf(nombre);
  if(col===-1){
    col = encabezados.filter(function(h){return h;}).length; // primera columna libre
    hoja.getRange(1, col+1).setValue(nombre).setFontWeight('bold');
  }
  var fila = 2;
  while(hoja.getRange(fila, col+1).getValue() !== '') fila++;
  hoja.getRange(fila, col+1).setValue(valor);
  return true;
}

function dbCatalogoEliminarItem_(nombre, valor){
  var hoja = getHojaCatalogos_();
  var datos = hoja.getDataRange().getValues();
  var encabezados = datos[0];
  var col = encabezados.indexOf(nombre);
  if(col===-1) return false;
  var lastRow = hoja.getLastRow();
  for(var f=1; f<datos.length; f++){
    if(String(datos[f][col])===String(valor)){
      if(f+2<=lastRow){
        var resto = hoja.getRange(f+2, col+1, lastRow-f-1, 1).getValues();
        hoja.getRange(f+1, col+1, resto.length, 1).setValues(resto);
      }
      hoja.getRange(lastRow, col+1).setValue('');
      return true;
    }
  }
  return false;
}
