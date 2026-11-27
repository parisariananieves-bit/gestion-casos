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

// Editar una minuta ya guardada: cambia los datos generales, actualiza los compromisos
// que ya existían (por id), agrega los nuevos y borra los de casos que se sacaron.
// El estado (pendiente/cumplido) de un compromiso existente NO se toca.
function svcActaActualizar_(id, datos, autor){
  var acta = dbActasListar_().find(function(a){ return String(a.id)===String(id); });
  if(!acta) return responseError_('No se encontró la minuta.');
  if(!datos.titulo) return responseError_('Falta el título de la reunión.');
  var nuevos = Array.isArray(datos.compromisosPorCaso) ? datos.compromisosPorCaso : [];
  var solo = Array.isArray(datos.casosSoloMencionados) ? datos.casosSoloMencionados.map(String) : [];
  var existentes = dbCompromisosPorActa_(id);
  var vinculados = nuevos.map(function(cp){ return String(cp.casoId); }).filter(Boolean);
  solo.forEach(function(cid){ if(cid && vinculados.indexOf(cid)===-1) vinculados.push(cid); });

  // Compromisos de casos que ya no están en la minuta → se borran.
  existentes.forEach(function(co){
    if(!nuevos.some(function(cp){ return String(cp.casoId)===String(co.casoId); })) dbCompromisoEliminar_(co.id);
  });
  nuevos.forEach(function(cp){
    if(!cp.casoId || !dbCasosBuscarPorId_(cp.casoId)) return;
    var previo = existentes.find(function(co){ return String(co.casoId)===String(cp.casoId); });
    var campos = {
      resumen:cp.resumen||'', problema:cp.problema||'', analisis:cp.analisis||'', decision:cp.decision||'', accion:cp.accion||'',
      responsableCompromiso:cp.responsableCompromiso||'', fechaLimite:cp.fechaLimite||'', observaciones:cp.observaciones||''
    };
    if(previo){ dbCompromisoActualizarCampos_(previo.id, campos); return; }
    var c = {id: utilNuevoIdCompromiso_(), actaId:id, casoId:cp.casoId, estado:'pendiente', fechaCreacion:utilAhoraTexto_(), fechaCumplido:''};
    Object.keys(campos).forEach(function(k){ c[k] = campos[k]; });
    dbCompromisosAgregar_(c);
  });
  // Casos que se suman a la minuta quedan anotados en su historial.
  vinculados.forEach(function(cid){
    if((acta.casosVinculados||[]).indexOf(cid)>-1 || !dbCasosBuscarPorId_(cid)) return;
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: cid, fecha: utilAhoraTexto_(), autor: autor||'Sistema', tipo:'sistema',
      texto: '📝 Se agregó a la minuta "'+datos.titulo+'" ('+id+')', visibleParaReportante:false
    });
  });
  dbActaActualizar_(id, {
    fecha: datos.fecha || acta.fecha, hora: datos.hora||'', titulo: datos.titulo, objetivo: datos.objetivo||'',
    responsableReunion: datos.responsableReunion||'', asistentes: datos.asistentes||'', temas: datos.temas||'',
    casosVinculados: vinculados, proximosPasos: datos.proximosPasos||''
  });
  return responseOk_({id:id});
}

function svcActaEliminar_(id, autor){
  var acta = dbActasListar_().find(function(a){ return String(a.id)===String(id); });
  if(!acta) return responseError_('No se encontró la minuta.');
  dbCompromisosPorActa_(id).forEach(function(co){ dbCompromisoEliminar_(co.id); });
  dbActaEliminar_(id);
  (acta.casosVinculados||[]).forEach(function(cid){
    if(!dbCasosBuscarPorId_(cid)) return;
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: cid, fecha: utilAhoraTexto_(), autor: autor||'Sistema', tipo:'sistema',
      texto: '🗑️ Se eliminó la minuta "'+acta.titulo+'" ('+id+')', visibleParaReportante:false
    });
  });
  return responseOk_({});
}
