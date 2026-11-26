/**
 * Services_PostventaImportService.gs
 * Trae a Gestión de Casos los clientes de la planilla de Postventa Chevrolet
 * (solapas "Clientes a Tratar interno" y "Clientes a Tratar Fabrica", nota <= 8).
 * Cada fila pasa por recibirEvento (fuente "NPS"), igual que cualquier otra fuente:
 * si la creación automática está apagada, cae en la Bandeja para confirmar.
 * No repite: cada fila lleva una clave (origenId) y si ya se importó se saltea.
 * La planilla solo se LEE, nunca se modifica.
 */
var PV_SHEET_ID_DEFAULT_ = '1L1IzFQpRss1poYfUhUUXIrBagC-y5uURyrSh-Fugqbk';

function pvTxt_(v){ return String(v===undefined||v===null?'':v).replace(/\s+/g,' ').trim(); }
function pvNota_(v){
  var t = pvTxt_(v); if(!/^\d{1,2}$/.test(t)) return null;
  var n = Number(t); return (n>=0 && n<=10) ? n : null;
}
function pvFecha_(v){
  var d = utilParseFechaTexto_(v); if(!d) return null;
  var y = d.getFullYear(); if(y<2000 || y>2100) return null;
  return d;
}
function pvFechaIso_(d){ return d ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') : ''; }
function pvNorm_(s){ return pvTxt_(s).toUpperCase().replace(/[^A-Z0-9]/g,''); }

function pvIdx_(headers, patrones){
  for(var i=0;i<headers.length;i++){
    var h = pvTxt_(headers[i]).toLowerCase();
    for(var j=0;j<patrones.length;j++) if(h.indexOf(patrones[j])===0 || h.indexOf(patrones[j])>-1) return i;
  }
  return -1;
}

function pvLeerFilas_(ss){
  var salida = [];
  // ---- Fábrica: cabecera por nombre ----
  var hF = ss.getSheetByName('Clientes a Tratar Fabrica');
  if(hF){
    var v = hF.getDataRange().getValues(), h = -1;
    for(var r=0;r<Math.min(v.length,6);r++){ if(pvTxt_(v[r][0]).toLowerCase()==='fecha' && pvIdx_(v[r],['sucursal'])>-1){ h=r; break; } }
    if(h>-1){
      var H = v[h];
      var c = { fecha:pvIdx_(H,['fecha']), suc:pvIdx_(H,['sucursal']), cli:pvIdx_(H,['cliente']), mod:pvIdx_(H,['modelo']), vin:pvIdx_(H,['vin']),
        nota:pvIdx_(H,['recomend']), com:pvIdx_(H,['comentario']), exp:pvIdx_(H,['explicaci']), resp:pvIdx_(H,['responsable']), res:pvIdx_(H,['resoluci']), est:pvIdx_(H,['estado']) };
      for(var i=h+1;i<v.length;i++){
        var f = v[i];
        salida.push({ origen:'Fábrica', fecha:f[c.fecha], sucursal:f[c.suc], cliente:f[c.cli], modelo:f[c.mod], patente:f[c.vin],
          nota:f[c.nota], comentario:f[c.com], explicacion:f[c.exp], responsable:f[c.resp], resolucion:f[c.res], estado:f[c.est] });
      }
    }
  }
  // ---- Interno: dos bloques en la misma fila de cabecera ----
  var hI = ss.getSheetByName('Clientes a Tratar interno');
  if(hI){
    var w = hI.getDataRange().getValues(), hh = -1;
    for(var r2=0;r2<Math.min(w.length,6);r2++){ if(pvIdx_(w[r2],['sucursal'])>-1 && pvIdx_(w[r2],['cliente'])>-1){ hh=r2; break; } }
    if(hh>-1){
      var HH = w[hh];
      var mes = -1; for(var k=0;k<HH.length;k++){ if(pvTxt_(HH[k]).toLowerCase()==='mes'){ mes=k; break; } }
      var izqFin = mes>-1 ? mes : HH.length;
      var L = HH.slice(0, izqFin);
      var ci = { fecha:pvIdx_(L,['fecha']), suc:pvIdx_(L,['sucursal']), cli:pvIdx_(L,['cliente']), mod:pvIdx_(L,['modelo']), pat:pvIdx_(L,['patente']),
        com:pvIdx_(L,['comentario']), rec:pvIdx_(L,['recomend']), exp:pvIdx_(L,['explicaci']), resp:pvIdx_(L,['responsable']), res:pvIdx_(L,['resoluci']), est:pvIdx_(L,['estado']) };
      for(var j=hh+1;j<w.length;j++){
        var row = w[j];
        // bloque izquierdo (cuando se carga a mano con todos los datos)
        var nI = pvNota_(row[ci.rec]); var comI = row[ci.com];
        if(nI===null && pvNota_(row[ci.com])!==null){ nI = pvNota_(row[ci.com]); comI = row[ci.rec]; }
        if(pvTxt_(row[ci.cli]) || pvTxt_(row[ci.pat])){
          salida.push({ origen:'Interna', fecha:row[ci.fecha], sucursal:row[ci.suc], cliente:row[ci.cli], modelo:row[ci.mod], patente:row[ci.pat],
            nota:nI, comentario:comI, explicacion:row[ci.exp], responsable:row[ci.resp], resolucion:row[ci.res], estado:row[ci.est] });
        }
        // bloque derecho: Mes, Fecha, Sucursal, Cliente, Modelo, Patente, Nota, Comentario, Estado
        if(mes>-1 && (pvTxt_(row[mes+3]) || pvTxt_(row[mes+5]))){
          var nota = pvNota_(row[mes+6]); var com = row[mes+7];
          if(nota===null && pvNota_(row[mes+7])!==null){ nota = pvNota_(row[mes+7]); com = row[mes+6]; }
          salida.push({ origen:'Interna', fecha:row[mes+1], sucursal:row[mes+2], cliente:row[mes+3], modelo:row[mes+4], patente:row[mes+5],
            nota:nota, comentario:com, explicacion:'', responsable:'', resolucion:'', estado:row[mes+8] });
        }
      }
    }
  }
  return salida;
}

function pvSinContenido_(t){
  var x = pvTxt_(t).toLowerCase().replace(/[.!¡]/g,'');
  return !x || ['no','ninguno','nada','sin respuesta','sin comentarios','sin comentario','todo correcto','todo bien','ok'].indexOf(x)>-1;
}

function pvPrioridad_(n){ return n===null ? 'Media' : (n<=4 ? 'Alta' : (n<=7 ? 'Media' : 'Baja')); }

// Devuelve las filas listas para revisar/importar, sin duplicados y marcando las ya importadas.
function pvCandidatos_(){
  var id = String(dbConfigLeer_('POSTVENTA_SHEET_ID', PV_SHEET_ID_DEFAULT_) || PV_SHEET_ID_DEFAULT_);
  var ss = SpreadsheetApp.openById(id);
  var filas = pvLeerFilas_(ss);
  var yaImportados = {};
  dbEventosListarTodos_().forEach(function(e){ var o = e.payloadOriginal && e.payloadOriginal.origenId; if(o) yaImportados[o] = true; });
  dbCasosListarTodos_().forEach(function(c){ if(c.origenId) yaImportados[String(c.origenId)] = true; });
  var vistos = {}, res = [];
  filas.forEach(function(f){
    var fecha = pvFecha_(f.fecha), nota = (typeof f.nota==='number') ? f.nota : pvNota_(f.nota);
    var cliente = pvTxt_(f.cliente), patente = pvTxt_(f.patente).toUpperCase().replace(/\s+/g,'');
    if(/^#/.test(patente)) patente = '';
    var comentario = pvTxt_(f.comentario);
    if(!cliente && !patente && !comentario) return;           // fila vacía (solo sucursal/nota)
    if(nota===null && !comentario) return;                    // sin nota ni comentario: basura
    if(nota!==null && nota>8) return;                         // la planilla es de nota <= 8
    var clave = 'PV|'+f.origen+'|'+(pvNorm_(patente)||pvNorm_(cliente)||pvNorm_(comentario).slice(0,20))+'|'+pvFechaIso_(fecha)+'|'+(nota===null?'':nota);
    if(vistos[clave]) return; vistos[clave] = true;           // repetida dentro de la planilla
    var estadoPl = pvTxt_(f.estado).toLowerCase();
    var resueltaPl = /resuelt|cerrad|solucion/.test(estadoPl);
    var sinTexto = pvSinContenido_(comentario) && nota!==null && nota>=7;
    res.push({
      clave: clave, origen: f.origen, fecha: fecha ? Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
      sucursal: pvTxt_(f.sucursal), cliente: cliente, modelo: pvTxt_(f.modelo), patente: patente, nota: nota,
      comentario: comentario, explicacion: pvTxt_(f.explicacion), responsable: pvTxt_(f.responsable), resolucion: pvTxt_(f.resolucion), estadoPlanilla: pvTxt_(f.estado),
      yaImportado: !!yaImportados[clave], resueltaEnPlanilla: resueltaPl, sugerido: !yaImportados[clave] && !resueltaPl && !sinTexto && (!!cliente || !!patente || (nota!==null && nota<=6))
    });
  });
  return res;
}

function svcPostventaPrevisualizar_(){
  try{
    var c = pvCandidatos_();
    return responseOk_({ filas:c, nuevas:c.filter(function(x){return !x.yaImportado;}).length, yaImportadas:c.filter(function(x){return x.yaImportado;}).length });
  }catch(e){ return responseError_('No pude leer la planilla de Postventa: '+e.message+' (revisá que la cuenta del script tenga acceso a esa planilla).'); }
}

function svcPostventaImportar_(claves){
  var set = {}; (claves||[]).forEach(function(k){ set[k]=true; });
  var lista = pvCandidatos_().filter(function(x){ return set[x.clave] && !x.yaImportado; });
  var ok = 0, errores = 0;
  lista.forEach(function(x){
    var partes = [];
    if(x.comentario) partes.push('Comentario del cliente: '+x.comentario);
    if(x.explicacion) partes.push('Explicación del reclamo: '+x.explicacion);
    if(x.responsable) partes.push('Responsable en planilla: '+x.responsable);
    if(x.resolucion) partes.push('Resolución en planilla: '+x.resolucion);
    var r = recibirEvento({
      fuente:'NPS', origenId:x.clave, cliente:x.cliente, patente:x.patente, modelo:x.modelo, marca:'Chevrolet',
      sucursal:x.sucursal, unidad:'Postventa / CSI', sector:'Postventa', tipoCaso:'Reclamo de cliente',
      motivo:'Encuesta postventa '+x.origen.toLowerCase()+(x.nota!==null?' — nota '+x.nota:''),
      descripcion: (partes.join('\n') || 'Sin comentario del cliente.') + (x.fecha?'\nFecha de la encuesta: '+x.fecha:''),
      prioridadSugerida: pvPrioridad_(x.nota)
    });
    if(r && r.ok!==false) ok++; else errores++;
  });
  return responseOk_({ importadas:ok, errores:errores });
}
