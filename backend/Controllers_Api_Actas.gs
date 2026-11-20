/**
 * Controllers_Api_Actas.gs
 * "Actas" en el código = "Minutas de reunión" de cara al usuario (Etapa 5).
 */
function apiListarActas(){
  return svcActasListar_();
}
function apiObtenerActa(params){
  if(!params || !params.id) return responseError_('Falta el ID de la minuta.');
  var acta = svcActaObtener_(params.id);
  return acta ? responseOk_({acta:acta}) : responseError_('No se encontró la minuta.');
}
function apiCrearActa(params){
  if(!params || !params.titulo) return responseError_('Falta el título.');
  // compromisosPorCaso y casosSoloMencionados llegan como array real (POST
  // JSON) — params.compromisosPorCaso ya es un array de objetos, no texto.
  return svcActaCrear_({
    fecha: params.fecha, hora: params.hora, titulo: params.titulo, objetivo: params.objetivo,
    responsableReunion: params.responsableReunion, asistentes: params.asistentes,
    temas: params.temas, proximosPasos: params.proximosPasos,
    compromisosPorCaso: params.compromisosPorCaso, casosSoloMencionados: params.casosSoloMencionados
  }, params.autor);
}
function apiListarCompromisos(params){
  return svcCompromisosListar_(params||{});
}
function apiMarcarCompromisoCumplido(params){
  if(!params || !params.id) return responseError_('Falta el ID del compromiso.');
  return svcCompromisoMarcarCumplido_(params.id, params.autor);
}
