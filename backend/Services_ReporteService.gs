/**
 * Services_ReporteService.gs
 * El corazón de "tener todo medido": tasa de resolución, desglose por
 * fuente/sector/marca/tipo, casos recurrentes (mismo VIN o cliente con 2+
 * casos — para detectar qué hay que tratar con urgencia) y tiempo promedio
 * de resolución.
 */

function parseFechaTextoGC_(str){
  if(!str) return null;
  // formato utilAhoraTexto_: 'dd/MM/yyyy HH:mm'
  var partes = String(str).split(' ');
  var fecha = (partes[0]||'').split('/');
  var hora = (partes[1]||'0:0').split(':');
  if(fecha.length!==3) return null;
  return new Date(Number(fecha[2]), Number(fecha[1])-1, Number(fecha[0]), Number(hora[0]||0), Number(hora[1]||0));
}

function contarPor_(casos, campo){
  var out = {};
  casos.forEach(function(c){
    var v = c[campo] || '(sin dato)';
    out[v] = (out[v]||0) + 1;
  });
  return Object.keys(out).map(function(k){ return {valor:k, cantidad:out[k]}; })
    .sort(function(a,b){ return b.cantidad-a.cantidad; });
}

function svcReporteDefensaConsumidor_(){
  var todos = dbCasosListarTodos_();
  var casos = todos.filter(function(c){ return c.defensaConsumidor===true || String(c.defensaConsumidor)==='true'; });
  var añoActual = new Date().getFullYear();
  var activos = casos.filter(function(c){ return c.estado!=='cerrado' && c.estado!=='resuelto'; });
  var resueltosEsteAnio = casos.filter(function(c){
    if(c.estado!=='cerrado' && c.estado!=='resuelto') return false;
    var f = parseFechaTextoGC_(c.cerradoFecha);
    return f && f.getFullYear()===añoActual;
  });
  var diasTotales = 0, contados = 0;
  casos.filter(function(c){return c.estado==='resuelto'||c.estado==='cerrado';}).forEach(function(c){
    var ini = parseFechaTextoGC_(c.fechaCreacion), fin = parseFechaTextoGC_(c.cerradoFecha);
    if(ini && fin){ diasTotales += Math.max(0,(fin-ini)/(1000*60*60*24)); contados++; }
  });
  var tiempoPromedioDias = contados ? Math.round((diasTotales/contados)*10)/10 : null;
  // Reincidencias: mismo cliente/VIN con más de un expediente de Defensa del Consumidor.
  var grupos = {};
  casos.forEach(function(c){
    var clave = c.dominio ? 'VIN:'+utilNormalizarTexto_(c.dominio) : 'CLIENTE:'+utilNormalizarTexto_(c.cliente);
    if(!grupos[clave]) grupos[clave]=[];
    grupos[clave].push(c.id);
  });
  var reincidencias = Object.values(grupos).filter(function(g){return g.length>=2;}).length;

  return responseOk_({
    activos: activos.length,
    resueltosEsteAnio: resueltosEsteAnio.length,
    tiempoPromedioDias: tiempoPromedioDias,
    reincidencias: reincidencias,
    expedientes: casos.sort(function(a,b){ return utilFechaMs_(b.fechaCreacion)-utilFechaMs_(a.fechaCreacion); })
  });
}

// Filtros opcionales del punto 11 de la especificación de reclamos:
// período (desde/hasta, sobre fechaCreacion), marca, sucursal, sector,
// estado. Sin filtros, se comporta exactamente igual que antes.
function aplicarFiltrosReporte_(casos, filtros){
  filtros = filtros || {};
  if(filtros.marca) casos = casos.filter(function(c){ return c.marca===filtros.marca; });
  if(filtros.sucursal) casos = casos.filter(function(c){ return c.sucursal===filtros.sucursal; });
  if(filtros.sector) casos = casos.filter(function(c){ return c.sector===filtros.sector; });
  if(filtros.estado) casos = casos.filter(function(c){ return c.estado===filtros.estado; });
  if(filtros.desde){
    var desde = new Date(filtros.desde);
    casos = casos.filter(function(c){ var f=parseFechaTextoGC_(c.fechaCreacion); return f && f>=desde; });
  }
  if(filtros.hasta){
    var hasta = new Date(filtros.hasta); hasta.setHours(23,59,59,999);
    casos = casos.filter(function(c){ var f=parseFechaTextoGC_(c.fechaCreacion); return f && f<=hasta; });
  }
  return casos;
}

function svcReporteResumen_(filtros){
  var casos = aplicarFiltrosReporte_(dbCasosListarTodos_(), filtros);
  var total = casos.length;
  var resueltos = casos.filter(function(c){ return c.estado==='resuelto' || c.estado==='cerrado'; });
  var abiertos = total - resueltos.length;
  var tasaResolucion = total ? Math.round((resueltos.length/total)*100) : 0;
  var defensaConsumidor = casos.filter(function(c){ return c.defensaConsumidor===true || String(c.defensaConsumidor)==='true'; }).length;

  // Tiempo promedio de resolución (en días), solo sobre los que tienen ambas fechas.
  var diasTotales = 0, contados = 0;
  resueltos.forEach(function(c){
    var ini = parseFechaTextoGC_(c.fechaCreacion);
    var fin = parseFechaTextoGC_(c.cerradoFecha);
    if(ini && fin){
      diasTotales += Math.max(0, (fin.getTime()-ini.getTime())/(1000*60*60*24));
      contados++;
    }
  });
  var tiempoPromedioResolucionDias = contados ? Math.round((diasTotales/contados)*10)/10 : null;

  // Recurrentes: agrupamos por VIN (si hay), o por cliente si no hay VIN.
  var grupos = {};
  casos.forEach(function(c){
    var clave = (c.dominio && String(c.dominio).trim()) ? ('VIN:'+utilNormalizarTexto_(c.dominio)) : ('CLIENTE:'+utilNormalizarTexto_(c.cliente));
    if(!clave || clave==='VIN:' || clave==='CLIENTE:') return;
    if(!grupos[clave]) grupos[clave] = {tipo: clave.indexOf('VIN:')===0?'vin':'cliente', valor: c.dominio||c.cliente, cliente:c.cliente, marca:c.marca, casos: []};
    grupos[clave].casos.push({id:c.id, motivo:c.motivo, estado:c.estado, fecha:c.fechaCreacion});
  });
  var recurrentes = Object.values(grupos).filter(function(g){ return g.casos.length>=2; })
    .sort(function(a,b){ return b.casos.length-a.casos.length; })
    .slice(0,15);

  // --- Agregado: indicadores de reclamos por formulario (punto 11 de la
  // especificación) — todos calculados sobre la misma hoja de Casos, sin
  // tablas nuevas. "reclamosFormulario" reutiliza el campo fuente, que ya
  // existía, con el valor 'Formulario web' que usa el nuevo flujo. ---
  var reclamosFormulario = casos.filter(function(c){ return c.fuente==='Formulario web'; });
  var conEvidencias = casos.filter(function(c){
    try{ return JSON.parse(c.evidencias||'[]').length>0; }catch(e){ return false; }
  }).length;
  var vencidos = casos.filter(function(c){
    var v = utilParseFechaTexto_(c.slaVencimiento); return v && v < new Date() && c.estado!=='cerrado' && c.estado!=='resuelto';
  }).length;
  var pendientesAsignacion = casos.filter(function(c){ return c.estado==='nuevo' && !c.responsable; }).length;
  var cerrados = casos.filter(function(c){ return c.estado==='cerrado'; }).length;

  var horasPrimerContactoTotal = 0, contadosPrimerContacto = 0;
  casos.forEach(function(c){
    if(!c.fechaPrimerContacto) return;
    var ini = parseFechaTextoGC_(c.fechaCreacion), primero = parseFechaTextoGC_(c.fechaPrimerContacto);
    if(ini && primero){ horasPrimerContactoTotal += Math.max(0,(primero-ini)/(1000*60*60)); contadosPrimerContacto++; }
  });
  var tiempoPromedioPrimerContactoHoras = contadosPrimerContacto ? Math.round((horasPrimerContactoTotal/contadosPrimerContacto)*10)/10 : null;

  // --- Agregado: Dashboard ejecutivo (Etapa 4) — más dimensiones sobre
  // los mismos casos, nada de datos ficticios ni tablas nuevas. ---
  var enGestion = casos.filter(function(c){ return c.estado==='analisis'; }).length;
  var pendientesRespuesta = casos.filter(function(c){ return c.estado==='esperando'; }).length;
  var reabiertos = casos.filter(function(c){ return c.reabierto===true || String(c.reabierto)==='true'; }).length;

  // Evolución mensual: últimos 12 meses con al menos un caso, en orden
  // cronológico (clave 'AAAA-MM' para que ordene bien como texto).
  var porMes = {};
  casos.forEach(function(c){
    var f = parseFechaTextoGC_(c.fechaCreacion);
    if(!f) return;
    var clave = f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0');
    porMes[clave] = (porMes[clave]||0)+1;
  });
  var evolucionMensual = Object.keys(porMes).sort().slice(-12).map(function(k){ return {mes:k, cantidad:porMes[k]}; });

  return responseOk_({
    total: total,
    abiertos: abiertos,
    resueltos: resueltos.length,
    tasaResolucion: tasaResolucion,
    defensaConsumidor: defensaConsumidor,
    tiempoPromedioResolucionDias: tiempoPromedioResolucionDias,
    porFuente: contarPor_(casos, 'fuente'),
    porSector: contarPor_(casos, 'sector'),
    porMarca: contarPor_(casos, 'marca'),
    porSucursal: contarPor_(casos, 'sucursal'),
    porTipoCaso: contarPor_(casos, 'tipoCaso'),
    porEstado: contarPor_(casos, 'estado'),
    porPrioridad: contarPor_(casos, 'prioridad'),
    porUnidad: contarPor_(casos, 'unidad'),
    porResponsable: contarPor_(casos.filter(function(c){return c.responsable;}), 'responsable'),
    porMotivo: contarPor_(casos.filter(function(c){return c.motivo;}), 'motivo').slice(0,10),
    evolucionMensual: evolucionMensual,
    enGestion: enGestion,
    pendientesRespuesta: pendientesRespuesta,
    reabiertos: reabiertos,
    recurrentes: recurrentes,
    reclamos: {
      totalFormulario: reclamosFormulario.length,
      porMarca: contarPor_(reclamosFormulario, 'marca'),
      porSucursal: contarPor_(reclamosFormulario, 'sucursal'),
      porSector: contarPor_(reclamosFormulario, 'sector'),
      conEvidencias: conEvidencias,
      tiempoPromedioPrimerContactoHoras: tiempoPromedioPrimerContactoHoras,
      pendientesAsignacion: pendientesAsignacion,
      vencidos: vencidos,
      cerrados: cerrados
    }
  });
}
