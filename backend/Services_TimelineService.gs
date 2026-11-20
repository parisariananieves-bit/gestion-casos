/**
 * Services_TimelineService.gs
 */
function svcTimelinePorVin_(vin){
  if(!vin) return responseError_('Falta el VIN/patente.');
  var eventos = dbTimelinePorVin_(vin);
  var casos = dbCasosBuscarPorVin_(vin);
  return responseOk_({vin: vin, eventos: eventos, casos: casos});
}
