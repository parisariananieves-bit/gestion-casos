/**
 * Utils_Respuestas.gs
 * Formato uniforme de respuesta — mismo espíritu que el {ok:true/false,...}
 * que ya usa Planning, para que el frontend maneje todo con el mismo patrón.
 */
function responseOk_(data){
  return Object.assign({ok:true}, data||{});
}
function responseError_(mensaje){
  return {ok:false, error:String(mensaje)};
}
