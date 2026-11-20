/**
 * Services_EventoService.gs
 * Cuando CREAR_CASOS_AUTOMATICO está apagado (default en Etapa 1), los
 * eventos quedan "pendientes de revisión manual". Estas funciones alimentan
 * esa cola y permiten confirmarlos (crear el caso) o descartarlos.
 */

function svcEventosPendientesRevision_(){
  return dbEventosListarTodos_().filter(function(e){
    return !e.casoGenerado && e.motivoDescarte==='Creación automática desactivada — revisar manualmente.';
  }).sort(function(a,b){ return new Date(b.fechaRecepcion) - new Date(a.fechaRecepcion); });
}

function svcEventoConfirmarComoCaso_(idEvento, usuario){
  var evento = dbEventosListarTodos_().find(function(e){ return e.id===idEvento; });
  if(!evento) return responseError_('No se encontró el evento.');
  if(evento.casoGenerado) return responseError_('Este evento ya generó un caso.');

  var evaluacion = evaluarEvento_(evento.datosNormalizados);
  evaluacion.fuente = evento.fuente;
  var idCaso = crearCasoDesdeEvento_(evento.datosNormalizados, evaluacion, evento.id);
  dbEventosMarcarProcesado_(evento.id, idCaso, '');
  if(usuario) dbCasosActualizarCampos_(idCaso, {creadoPor: usuario});
  return responseOk_({id: idCaso, codigo: idCaso});
}

function svcEventoDescartar_(idEvento, motivo){
  var ok = dbEventosMarcarProcesado_(idEvento, '', motivo || 'Descartado manualmente.');
  return ok ? responseOk_({}) : responseError_('No se encontró el evento.');
}
