/**
 * Controllers_Api_Actas.gs
 */
function apiListarActas(){
  return svcActasListar_();
}
function apiCrearActa(params){
  if(!params || !params.titulo) return responseError_('Falta el título.');
  var casosVinculados = params.casosVinculados ? String(params.casosVinculados).split(',').map(function(s){return s.trim();}).filter(Boolean) : [];
  return svcActaCrear_({
    fecha: params.fecha, titulo: params.titulo, asistentes: params.asistentes,
    temas: params.temas, casosVinculados: casosVinculados, proximosPasos: params.proximosPasos
  }, params.autor);
}
