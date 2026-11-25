/**
 * Services_EventoService.gs
 * Cuando CREAR_CASOS_AUTOMATICO está apagado (default en Etapa 1), los
 * eventos quedan "pendientes de revisión manual". Estas funciones alimentan
 * esa cola y permiten confirmarlos (crear el caso) o descartarlos.
 */

function svcEventosPendientesRevision_(){
  return dbEventosListarTodos_().filter(function(e){
    return !e.casoGenerado && e.motivoDescarte==='Creación automática desactivada — revisar manualmente.';
  }).sort(function(a,b){ return utilFechaMs_(b.fechaRecepcion) - utilFechaMs_(a.fechaRecepcion); });
}

function svcEventoConfirmarComoCaso_(idEvento, usuario){
  var evento = dbEventosListarTodos_().find(function(e){ return e.id===idEvento; });
  if(!evento) return responseError_('No se encontró el evento.');
  if(evento.casoGenerado) return responseError_('Este evento ya generó un caso.');

  var evaluacion = evaluarEvento_(evento.datosNormalizados);
  evaluacion.fuente = evento.fuente;
  var idCaso = crearCasoDesdeEvento_(evento.datosNormalizados, evaluacion, evento.id);
  dbEventosMarcarProcesado_(evento.id, idCaso, '');
  if(usuario) dbCasosActualizarCampos_(idCaso, {creadoPor: usuario});
  return responseOk_({id: idCaso, codigo: idCaso});
}

function svcEventoDescartar_(idEvento, motivo){
  var ok = dbEventosMarcarProcesado_(idEvento, '', motivo || 'Descartado manualmente.');
  return ok ? responseOk_({}) : responseError_('No se encontró el evento.');
}

// Lotes de la Bandeja. El frontend manda de a ~15 ids por llamada (Apps
// Script tiene límite de tiempo por ejecución). Si el vehículo ya tiene un
// caso abierto, el evento se suma ahí como novedad en vez de abrir otro caso
// (mismo criterio que recibirEvento). Se lee la hoja de eventos una sola vez.
function svcEventosConfirmarLote_(idEventos, usuario){
  var todos = dbEventosListarTodos_(), res = {creados:0, fusionados:0, errores:[]};
  (idEventos||[]).forEach(function(id){
    try{
      var evento = todos.find(function(e){ return e.id===id; });
      if(!evento){ res.errores.push(id+': no encontrado'); return; }
      if(evento.casoGenerado){ res.errores.push(id+': ya tenía caso'); return; }
      var datos = evento.datosNormalizados || {};
      var abierto = buscarCasoAbiertoPorVin_(datos.vin);
      if(abierto){
        dbSeguimientosAgregar_({
          id: utilNuevoIdSeguimiento_(), casoId: abierto.id, fecha: utilAhoraTexto_(), autor: usuario||'Sistema', tipo: 'sistema',
          texto: '🔁 Evento de "'+(evento.fuente||'Manual')+'" para este mismo vehículo — se sumó acá en vez de abrir un caso nuevo.'+(datos.motivo?' Motivo: '+datos.motivo:'')+(datos.descripcion?' — '+datos.descripcion:''),
          visibleParaReportante: false
        });
        dbEventosMarcarProcesado_(evento.id, abierto.id, 'Fusionado con caso abierto existente ('+abierto.id+').');
        res.fusionados++;
        return;
      }
      var evaluacion = evaluarEvento_(datos); evaluacion.fuente = evento.fuente;
      var idCaso = crearCasoDesdeEvento_(datos, evaluacion, evento.id);
      dbEventosMarcarProcesado_(evento.id, idCaso, '');
      if(usuario) dbCasosActualizarCampos_(idCaso, {creadoPor: usuario});
      res.creados++;
    }catch(err){ res.errores.push(id+': '+err); }
  });
  return responseOk_(res);
}
function svcEventosDescartarLote_(idEventos, motivo){
  var n = 0;
  (idEventos||[]).forEach(function(id){ if(dbEventosMarcarProcesado_(id, '', motivo || 'Descartado manualmente.')) n++; });
  return responseOk_({descartados:n});
}
