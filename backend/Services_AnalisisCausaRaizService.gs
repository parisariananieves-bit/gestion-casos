/**
 * Services_AnalisisCausaRaizService.gs
 */
function svcAnalisisObtenerPorCaso_(casoId){
  var existente = dbAnalisisBuscarPorCaso_(casoId);
  return responseOk_({analisis: existente ? existente.obj : null});
}
function svcAnalisisGuardar_(casoId, datos, autor){
  var caso = dbCasosBuscarPorId_(casoId);
  if(!caso) return responseError_('No se encontró el caso.');
  if(!datos.problema) return responseError_('Falta describir el problema.');
  datos.autor = autor;
  var id = dbAnalisisGuardar_(casoId, datos);
  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: casoId, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
    tipo: 'sistema', texto: '🔍 Análisis de causa raíz (5 Porqués) guardado/actualizado.',
    visibleParaReportante: false
  });
  return responseOk_({id: id});
}
