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

// Avisa por mail a la persona a la que le asignan o derivan un caso (si
// tiene email cargado en Equipo). No bloquea nada si el mail falla.
function utilNotificarAsignacionCaso_(caso, responsable, tipo, autor){
  try{
    var u = dbUsuariosListar_().find(function(x){ return String(x.nombre).trim().toLowerCase()===String(responsable).trim().toLowerCase(); });
    if(!u || !u.email) return;
    var asunto = 'Te '+(tipo==='derivado'?'derivaron':'asignaron')+' el caso '+caso.id+' — '+(caso.cliente||'');
    var cuerpo =
      (autor||'Calidad')+' te '+(tipo==='derivado'?'derivó':'asignó')+' un caso.\n\n'+
      'Caso: '+caso.id+'\n'+
      'Cliente: '+(caso.cliente||'—')+(caso.telefono?' ('+caso.telefono+')':'')+'\n'+
      'Marca / Sucursal: '+(caso.marca||'—')+' / '+(caso.sucursal||'—')+'\n'+
      'Vehículo: '+(caso.modelo||'—')+' '+(caso.dominio||'')+'\n'+
      'Motivo: '+(caso.motivo||'—')+'\n'+
      'Descripción: '+(caso.descripcion||'—')+'\n'+
      'Prioridad: '+(caso.prioridad||'—')+'\n\n'+
      'Ingresá a Gestión de Casos para verlo y cargar novedades.';
    MailApp.sendEmail(u.email, asunto, cuerpo);
  }catch(e){}
}

// Resumen diario por mail: a cada responsable con casos abiertos le manda lo
// que necesita atención (estancados, SLA vencido, próximo paso vencido o de
// hoy). Correr UNA vez instalarResumenDiario() desde el editor de Apps Script.
function enviarResumenDiarioCasos(){
  var UMBRAL = 10, ahora = new Date(), hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  var usuarios = dbUsuariosListar_();
  var porPersona = {};
  dbCasosListarTodos_().forEach(function(c){
    if(c.estado==='resuelto' || c.estado==='cerrado' || !c.responsable) return;
    var motivos = [];
    var creado = utilParseFechaTexto_(c.fechaCreacion);
    if(creado && Math.floor((ahora-creado)/86400000) >= UMBRAL) motivos.push('lleva '+Math.floor((ahora-creado)/86400000)+' días sin resolverse');
    var sla = utilParseFechaTexto_(c.slaVencimiento);
    if(sla && sla < ahora) motivos.push('SLA vencido');
    var pp = utilParseFechaTexto_(c.proximoPasoFecha);
    if(pp && pp <= new Date(hoy.getTime()+86400000-1)) motivos.push((pp<hoy?'próximo paso vencido':'próximo paso hoy')+(c.proximoPasoTexto?': '+c.proximoPasoTexto:''));
    if(!motivos.length) return;
    (porPersona[c.responsable] = porPersona[c.responsable] || []).push('• '+c.id+' — '+(c.cliente||'')+' ('+motivos.join(' · ')+')');
  });
  Object.keys(porPersona).forEach(function(nombre){
    var u = usuarios.find(function(x){ return String(x.nombre).trim().toLowerCase()===nombre.trim().toLowerCase(); });
    if(!u || !u.email) return;
    try{ MailApp.sendEmail(u.email, 'Casos que necesitan atención hoy ('+porPersona[nombre].length+')',
      'Hola '+nombre.split(' ')[0]+', estos casos tuyos necesitan atención:\n\n'+porPersona[nombre].join('\n')+'\n\nIngresá a Gestión de Casos para resolverlos.'); }catch(e){}
  });
}
function instalarResumenDiario(){
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction()==='enviarResumenDiarioCasos') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('enviarResumenDiarioCasos').timeBased().everyDays(1).atHour(8).create();
}
