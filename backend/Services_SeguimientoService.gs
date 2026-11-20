/**
 * Services_SeguimientoService.gs
 * Filtra qué seguimientos puede ver quien reportó un caso (rol 'sector') —
 * esa persona solo debe ver los marcados visibleParaReportante=true, nunca
 * las notas internas de Calidad.
 */
function svcSeguimientosVisiblesParaReportante_(casoId){
  return dbSeguimientosPorCaso_(casoId).filter(function(s){ return s.visibleParaReportante; });
}
function svcSeguimientosTodos_(casoId){
  return dbSeguimientosPorCaso_(casoId);
}
