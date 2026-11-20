/**
 * Services_NotificacionService.gs
 * Notificaciones por email — mismo mecanismo simple (MailApp) que ya usaba
 * la versión anterior del sistema (notifyNewCaso en el Code.gs viejo), pero
 * ahora centralizado en un solo lugar para no repetir código. No depende de
 * ninguna cuenta nueva: usa la cuenta de Google dueña del script.
 */

function utilListaEmailsEquipoCalidad_(){
  return String(dbConfigLeer_(CONFIG_KEYS.EMAILS_EQUIPO_CALIDAD, '') || '')
    .split(',').map(function(e){ return e.trim(); }).filter(Boolean);
}

// Se dispara cuando entra un reclamo nuevo por el formulario público.
function utilNotificarEquipoCalidadReclamoNuevo_(caso){
  var destinatarios = utilListaEmailsEquipoCalidad_();
  if(!destinatarios.length) return; // sin emails configurados — no rompe nada, solo no notifica
  var asunto = 'Nuevo reclamo recibido — '+caso.id+' ('+(caso.marca||'—')+')';
  var cuerpo =
    'Llegó un reclamo nuevo por el formulario web.\n\n'+
    'Caso: '+caso.id+'\n'+
    'Cliente: '+caso.cliente+' ('+(caso.telefono||caso.email||'sin contacto')+')\n'+
    'Marca / Sucursal: '+(caso.marca||'—')+' / '+(caso.sucursal||'—')+'\n'+
    'Sector: '+(caso.sector||'—')+'\n'+
    'Motivo: '+(caso.motivo||'—')+'\n'+
    'Descripción: '+(caso.descripcion||'—')+'\n'+
    'Solución esperada por el cliente: '+(caso.solucionEsperada||'—')+'\n'+
    'Evidencias adjuntas: '+(JSON.parse(caso.evidencias||'[]').length)+'\n\n'+
    'Ingresá a Gestión de Casos para asignarlo.';
  try{ MailApp.sendEmail(destinatarios.join(','), asunto, cuerpo); }catch(e){ /* no bloquea el alta del caso */ }
}

// Se dispara cuando el cliente agrega información/archivos desde el link
// de seguimiento — avisa puntualmente al responsable asignado (si hay uno
// y tiene email registrado en Usuarios), y si no, al equipo general.
function utilNotificarResponsableNuevaInfoCliente_(caso){
  var destinatarios = [];
  if(caso.responsable){
    try{
      var u = dbUsuariosListar_().find(function(x){ return String(x.nombre).trim().toLowerCase()===String(caso.responsable).trim().toLowerCase(); });
      if(u && u.email) destinatarios.push(u.email);
    }catch(e){}
  }
  if(!destinatarios.length) destinatarios = utilListaEmailsEquipoCalidad_();
  if(!destinatarios.length) return;
  var asunto = 'El cliente agregó información — '+caso.id;
  var cuerpo =
    'El cliente respondió a la solicitud de información adicional del caso '+caso.id+'.\n\n'+
    'Cliente: '+caso.cliente+'\n'+
    'Ingresá al expediente para ver los nuevos archivos/comentarios.';
  try{ MailApp.sendEmail(destinatarios.join(','), asunto, cuerpo); }catch(e){}
}
