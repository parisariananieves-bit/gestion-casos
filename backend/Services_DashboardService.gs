/**
 * Services_DashboardService.gs
 */
function svcDashboardResumen_(){
  var casos = dbCasosListarTodos_();
  var abiertos = casos.filter(function(c){ return c.estado!=='cerrado' && c.estado!=='resuelto'; });
  var urgentes = abiertos.filter(function(c){ return c.prioridad==='Alta'; });
  var vencidos = abiertos.filter(function(c){
    if(!c.slaVencimiento) return false;
    return new Date(c.slaVencimiento) < new Date();
  });
  var resueltosSemana = casos.filter(function(c){
    if(!c.cerradoFecha) return false;
    var dias = utilDiasEntre_(c.cerradoFecha);
    return dias!==null && dias<=7;
  });
  var nuevos = casos.filter(function(c){ return c.estado==='nuevo'; });

  return responseOk_({
    totalCasos: casos.length,
    abiertos: abiertos.length,
    urgentes: urgentes.length,
    vencidos: vencidos.length,
    resueltosSemana: resueltosSemana.length,
    nuevosSinAsignar: nuevos.filter(function(c){return !c.responsable;}).length,
    eventosPendientesRevision: svcEventosPendientesRevision_().length
  });
}
