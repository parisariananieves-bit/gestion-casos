/**
 * Services_DashboardService.gs
 */
function svcDashboardResumen_(filtros){
  var casos = aplicarFiltrosReporte_(dbCasosListarTodos_(), filtros);
  var abiertos = casos.filter(function(c){ return c.estado!=='cerrado' && c.estado!=='resuelto'; });
  var urgentes = abiertos.filter(function(c){ return c.prioridad==='Alta'; });
  var vencidos = abiertos.filter(function(c){
    if(!c.slaVencimiento) return false;
    var v = utilParseFechaTexto_(c.slaVencimiento); return !!v && v < new Date();
  });
  var resueltosSemana = casos.filter(function(c){
    if(!c.cerradoFecha) return false;
    var dias = utilDiasEntre_(c.cerradoFecha);
    return dias!==null && dias<=7;
  });
  var nuevos = casos.filter(function(c){ return c.estado==='nuevo'; });
  // --- Agregado: Dashboard ejecutivo (Etapa 4) ---
  var enGestion = casos.filter(function(c){ return c.estado==='analisis'; });
  var pendientesRespuesta = casos.filter(function(c){ return c.estado==='esperando'; });
  var reabiertos = casos.filter(function(c){ return c.reabierto===true || String(c.reabierto)==='true'; });

  return responseOk_({
    totalCasos: casos.length,
    abiertos: abiertos.length,
    urgentes: urgentes.length,
    vencidos: vencidos.length,
    resueltosSemana: resueltosSemana.length,
    nuevosSinAsignar: nuevos.filter(function(c){return !c.responsable;}).length,
    eventosPendientesRevision: svcEventosPendientesRevision_().length,
    enGestion: enGestion.length,
    pendientesRespuesta: pendientesRespuesta.length,
    reabiertos: reabiertos.length
  });
}
