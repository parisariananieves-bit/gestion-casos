/**
 * Services_ReunionService.gs
 * Reuniones semanales de casos. Se guardan en la hoja "Reuniones" (y se ven en el
 * calendario de la app) y, si se pide, se crean también como evento que se repite
 * cada semana en Google Calendar, con invitación a los participantes.
 *
 * IMPORTANTE (una sola vez): para que pueda escribir en Google Calendar hay que correr
 * la función autorizarCalendario() desde el editor de Apps Script y aceptar el permiso.
 */
var DIAS_CAL_ = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

function autorizarCalendario(){
  var cal = CalendarApp.getDefaultCalendar();
  Logger.log('Calendario listo: '+cal.getName());
}

function svcReunionesListar_(){
  return responseOk_({reuniones: dbReunionesListar_()});
}

function svcReunionProximaFecha_(diaSemana, hora){
  var p = String(hora||'10:00').split(':'), h = Number(p[0])||0, m = Number(p[1])||0;
  var d = new Date(); d.setHours(h, m, 0, 0);
  var hoyDia = d.getDay()===0 ? 7 : d.getDay();
  var delta = (diaSemana - hoyDia + 7) % 7;
  if(delta===0 && d.getTime() < Date.now()) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}

// Crea (o vuelve a crear) la serie semanal en Google Calendar. Devuelve {id} o {error}.
function svcReunionSyncCalendario_(r){
  try{
    var cal = CalendarApp.getDefaultCalendar();
    if(r.googleEventId){ try{ cal.getEventSeriesById(r.googleEventId).deleteEventSeries(); }catch(e){} }
    var inicio = svcReunionProximaFecha_(r.diaSemana, r.hora);
    var fin = new Date(inicio.getTime() + (Number(r.duracionMin)||60)*60000);
    var invitados = String(r.participantes||'').split(/[,;\s]+/).filter(function(x){ return /@/.test(x); }).join(',');
    var desc = 'Reunión semanal de casos — Gestión de Casos (Grupo París)\n'+
      (r.unidad ? 'Unidad de negocio: '+r.unidad+'\n' : '')+(r.sucursal ? 'Sucursal: '+r.sucursal+'\n' : '')+
      'La agenda con los casos de la semana está en el calendario de Gestión de Casos.';
    var serie = cal.createEventSeries(r.titulo, inicio, fin,
      CalendarApp.newRecurrence().addWeeklyRule().onlyOnWeekday(CalendarApp.Weekday[DIAS_CAL_[r.diaSemana-1]]),
      {description: desc, location: r.lugar||'', guests: invitados, sendInvites: !!invitados});
    return {id: serie.getId()};
  }catch(e){ return {error: String(e && e.message || e)}; }
}

function svcReunionGuardar_(p){
  var titulo = String(p.titulo||'').trim();
  var dia = Number(p.diaSemana), hora = String(p.hora||'').trim();
  if(!titulo) return responseError_('Poné un título para la reunión.');
  if(!(dia>=1 && dia<=7)) return responseError_('Elegí el día de la semana.');
  if(!/^\d{1,2}:\d{2}$/.test(hora)) return responseError_('Poné la hora (ej: 10:00).');
  var previa = p.id ? dbReunionesListar_().filter(function(x){ return x.id===p.id; })[0] : null;
  var r = {
    id: previa ? previa.id : 'RS-'+Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd')+'-'+Math.floor(Math.random()*9000+1000),
    titulo: titulo, unidad: String(p.unidad||'').trim(), sucursal: String(p.sucursal||'').trim(),
    diaSemana: dia, hora: hora, duracionMin: Number(p.duracionMin)||60, lugar: String(p.lugar||'').trim(),
    participantes: String(p.participantes||'').trim(), googleEventId: previa ? previa.googleEventId : '',
    activo: true, creadoPor: previa ? previa.creadoPor : String(p.autor||''), fechaCreacion: previa ? previa.fechaCreacion : utilAhoraTexto_()
  };
  var calendario = 'no';
  if(p.googleCalendar){
    var res = svcReunionSyncCalendario_(r);
    if(res.id){ r.googleEventId = res.id; calendario = 'ok'; }
    else calendario = res.error || 'error';
  } else if(previa && previa.googleEventId){
    // Antes estaba en Google Calendar y ahora no: se saca de ahí
    try{ CalendarApp.getDefaultCalendar().getEventSeriesById(previa.googleEventId).deleteEventSeries(); }catch(e){}
    r.googleEventId = '';
  }
  dbReunionesGuardar_(r);
  return responseOk_({reunion: r, calendario: calendario});
}

function svcReunionEliminar_(id){
  var r = dbReunionesListar_().filter(function(x){ return x.id===id; })[0];
  if(!r) return responseError_('No se encontró la reunión.');
  if(r.googleEventId){ try{ CalendarApp.getDefaultCalendar().getEventSeriesById(r.googleEventId).deleteEventSeries(); }catch(e){} }
  dbReunionesEliminar_(id);
  return responseOk_({});
}
