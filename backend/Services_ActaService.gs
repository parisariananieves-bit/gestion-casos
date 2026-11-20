/**
 * Services_ActaService.gs
 * Minutas de reunión (Etapa 5) — ampliación del módulo Actas: selección
 * real de casos (por ID, nunca duplicados ni texto libre) y un compromiso
 * por cada caso tratado, con responsable y fecha límite propios.
 */
function svcActasListar_(){
  return responseOk_({actas: dbActasListar_()});
}

function svcActaObtener_(id){
  var acta = dbActasListar_().find(function(a){ return String(a.id)===String(id); });
  if(!acta) return null;
  acta.compromisos = dbCompromisosPorActa_(id).map(decorarCompromisoConEstadoReal_);
  return acta;
}

// El estado guardado solo distingue pendiente/cumplido — "vencido" es
// pendiente + fecha límite pasada, se calcula al leer, nunca se guarda
// (así nunca queda desactualizado).
function decorarCompromisoConEstadoReal_(co){
  co.estadoReal = co.estado;
  if(co.estado==='pendiente' && co.fechaLimite){
    var f = new Date(co.fechaLimite);
    if(!isNaN(f.getTime()) && f < new Date()) co.estadoReal = 'vencido';
  }
  return co;
}

// Minutas en las que un caso fue tratado — usado desde el detalle del
// caso ("Reuniones en las que fue tratado").
function svcActasPorCaso_(casoId){
  var actas = dbActasListar_().filter(function(a){ return (a.casosVinculados||[]).indexOf(String(casoId))>-1; });
  return actas.map(function(a){
    var compromiso = dbCompromisosPorCaso_(casoId).find(function(co){ return String(co.actaId)===String(a.id); });
    return {id:a.id, fecha:a.fecha, titulo:a.titulo, compromiso: compromiso ? decorarCompromisoConEstadoReal_(compromiso) : null};
  });
}

// datos.compromisosPorCaso: [{casoId, resumen, problema, analisis,
// decision, accion, responsableCompromiso, fechaLimite, observaciones}]
// — uno por cada caso seleccionado al armar la minuta. Puede venir vacío
// (una reunión sin casos puntuales, solo temas generales).
function svcActaCrear_(datos, autor){
  if(!datos.titulo) return responseError_('Falta el título de la reunión.');
  var compromisosPorCaso = Array.isArray(datos.compromisosPorCaso) ? datos.compromisosPorCaso : [];
  var casosVinculados = compromisosPorCaso.map(function(cp){ return String(cp.casoId); }).filter(Boolean);
  // Además de los que tienen compromiso, se admiten casos "solo mencionados"
  // (vinculados sin compromiso puntual) vía datos.casosSoloMencionados.
  (Array.isArray(datos.casosSoloMencionados) ? datos.casosSoloMencionados : []).forEach(function(cid){
    if(cid && casosVinculados.indexOf(String(cid))===-1) casosVinculados.push(String(cid));
  });

  var acta = {
    id: utilNuevoIdActa_(),
    fecha: datos.fecha || utilAhoraTexto_(),
    hora: datos.hora || '',
    titulo: datos.titulo,
    objetivo: datos.objetivo || '',
    responsableReunion: datos.responsableReunion || autor || '',
    asistentes: datos.asistentes || '',
    temas: datos.temas || '',
    casosVinculados: casosVinculados,
    proximosPasos: datos.proximosPasos || '',
    creadoPor: autor || ''
  };
  dbActaCrear_(acta);

  compromisosPorCaso.forEach(function(cp){
    if(!cp.casoId || !dbCasosBuscarPorId_(cp.casoId)) return;
    var compromiso = {
      id: utilNuevoIdCompromiso_(), actaId: acta.id, casoId: cp.casoId,
      resumen: cp.resumen||'', problema: cp.problema||'', analisis: cp.analisis||'',
      decision: cp.decision||'', accion: cp.accion||'', responsableCompromiso: cp.responsableCompromiso||'',
      fechaLimite: cp.fechaLimite||'', observaciones: cp.observaciones||'',
      estado: 'pendiente', fechaCreacion: utilAhoraTexto_(), fechaCumplido: ''
    };
    dbCompromisosAgregar_(compromiso);
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: cp.casoId, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
      tipo: 'sistema',
      texto: '📝 Tratado en la minuta "'+acta.titulo+'" ('+acta.id+')'+(cp.accion?(' — acción acordada: '+cp.accion):'')+(cp.responsableCompromiso?(' · responsable: '+cp.responsableCompromiso):'')+(cp.fechaLimite?(' · vence '+cp.fechaLimite):''),
      visibleParaReportante: false
    });
  });
  // Casos vinculados sin compromiso puntual (solo mencionados).
  (Array.isArray(datos.casosSoloMencionados) ? datos.casosSoloMencionados : []).forEach(function(cid){
    if(!cid || !dbCasosBuscarPorId_(cid)) return;
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: cid, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
      tipo: 'sistema', texto: '📝 Se mencionó en la minuta "'+acta.titulo+'" ('+acta.id+')',
      visibleParaReportante: false
    });
  });

  return responseOk_({id: acta.id});
}

// Vista "Compromisos" (pendientes / cumplidos / vencidos), opcionalmente
// filtrada por responsable o caso.
function svcCompromisosListar_(filtros){
  filtros = filtros || {};
  var compromisos = dbCompromisosListarTodos_().map(decorarCompromisoConEstadoReal_);
  if(filtros.responsable) compromisos = compromisos.filter(function(c){ return c.responsableCompromiso===filtros.responsable; });
  if(filtros.casoId) compromisos = compromisos.filter(function(c){ return String(c.casoId)===String(filtros.casoId); });
  if(filtros.estado) compromisos = compromisos.filter(function(c){ return c.estadoReal===filtros.estado; });
  return responseOk_({compromisos: compromisos.sort(function(a,b){ return new Date(a.fechaLimite||'2999-12-31') - new Date(b.fechaLimite||'2999-12-31'); })});
}

function svcCompromisoMarcarCumplido_(id, autor){
  var compromisos = dbCompromisosListarTodos_();
  var compromiso = compromisos.find(function(c){ return String(c.id)===String(id); });
  if(!compromiso) return responseError_('No se encontró el compromiso.');
  dbCompromisoActualizarCampos_(id, {estado:'cumplido', fechaCumplido: utilAhoraTexto_()});
  if(compromiso.casoId && dbCasosBuscarPorId_(compromiso.casoId)){
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: compromiso.casoId, fecha: utilAhoraTexto_(), autor: autor||'Sistema',
      tipo: 'sistema', texto: '✅ Compromiso cumplido: '+(compromiso.accion||compromiso.decision||'(sin descripción)'),
      visibleParaReportante: false
    });
  }
  return responseOk_({});
}
