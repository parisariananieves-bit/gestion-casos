/**
 * Controllers_Api_Reportes.gs
 */
function apiObtenerReporte(params){
  return svcReporteResumen_(params||{});
}
function apiObtenerReporteDefensaConsumidor(){
  return svcReporteDefensaConsumidor_();
}
