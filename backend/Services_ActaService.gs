/**
 * Services_ActaService.gs
 */
function svcActasListar_(){
  return responseOk_({actas: dbActasListar_()});
}
function svcActaCrear_(datos, autor){
  if(!datos.titulo) return responseError_('Falta el título del acta.');
  var acta = {
    id: utilNuevoIdActa_(),
    fecha: datos.fecha || utilAhoraTexto_(),
    titulo: datos.titulo,
    asistentes: datos.asistentes || '',
    temas: datos.temas || '',
    casosVinculados: datos.casosVinculados || [],
    proximosPasos: datos.proximosPasos || '',
    creadoPor: autor || ''
  };
  dbActaCrear_(acta);
  // Si hay casos vinculados, queda una referencia cruzada en cada uno.
  (acta.casosVinculados||[]).forEach(function(casoId){
    if(!casoId) return;
    if(dbCasosBuscarPorId_(casoId)){
      dbSeguimientosAgregar_({
        id: utilNuevoIdSeguimiento_(), casoId: casoId, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
        tipo: 'sistema', texto: '📝 Se trató en el acta "'+acta.titulo+'" ('+acta.id+')',
        visibleParaReportante: false
      });
    }
  });
  return responseOk_({id: acta.id});
}
