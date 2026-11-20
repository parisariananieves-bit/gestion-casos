/**
 * Controllers_Api_CausaRaiz.gs
 */
function apiObtenerAnalisisCausaRaiz(params){
  if(!params || !params.casoId) return responseError_('Falta el ID del caso.');
  return svcAnalisisObtenerPorCaso_(params.casoId);
}
function apiGuardarAnalisisCausaRaiz(params){
  if(!params || !params.casoId) return responseError_('Falta el ID del caso.');
  return svcAnalisisGuardar_(params.casoId, {
    problema: params.problema, porque1: params.porque1, porque2: params.porque2,
    porque3: params.porque3, porque4: params.porque4, porque5: params.porque5,
    causaRaiz: params.causaRaiz, planAccion: params.planAccion,
    responsablePlan: params.responsablePlan, fechaLimitePlan: params.fechaLimitePlan,
    estadoPlan: params.estadoPlan
  }, params.autor);
}
