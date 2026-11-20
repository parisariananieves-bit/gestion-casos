/**
 * Utils_Fechas.gs
 */
function utilAhoraTexto_(){
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}
function utilCalcularSLA_(prioridad){
  var config = dbConfigLeerTodo_();
  var horas = prioridad==='Alta' ? Number(config[CONFIG_KEYS.SLA_HORAS_ALTA]||24)
    : prioridad==='Media' ? Number(config[CONFIG_KEYS.SLA_HORAS_MEDIA]||72)
    : Number(config[CONFIG_KEYS.SLA_HORAS_BAJA]||168);
  var vencimiento = new Date(Date.now() + horas*60*60*1000);
  return Utilities.formatDate(vencimiento, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}
function utilDiasEntre_(fechaTexto){
  if(!fechaTexto) return null;
  var f = new Date(fechaTexto);
  if(isNaN(f.getTime())) return null;
  return Math.floor((Date.now() - f.getTime()) / (1000*60*60*24));
}
