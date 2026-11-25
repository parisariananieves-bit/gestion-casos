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

// Las fechas de la planilla pueden venir como Date real o como texto
// "dd/MM/yyyy HH:mm" (que new Date() NO interpreta bien: toma mm/dd).
function utilParseFechaTexto_(v){
  if(!v) return null;
  if(v instanceof Date) return isNaN(v.getTime()) ? null : v;
  var t = String(v).trim();
  var m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if(m) return new Date(Number(m[3]), Number(m[2])-1, Number(m[1]), Number(m[4]||0), Number(m[5]||0));
  var d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}
function utilFechaMs_(v){ var d = utilParseFechaTexto_(v); return d ? d.getTime() : 0; }
