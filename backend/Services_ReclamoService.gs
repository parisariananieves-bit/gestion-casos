/**
 * Services_ReclamoService.gs
 * Lógica del formulario público de reclamos (clientes, sin login). Esto NO
 * es un sistema paralelo: valida, sube evidencias a Drive, y entra al
 * sistema por la misma puerta que todo lo demás — recibirEvento() del
 * Motor de Eventos (Engine_EventEngine.gs) — así un reclamo de WhatsApp/
 * formulario queda exactamente igual de íntegro que un caso manual o uno
 * de Planning.
 */

var RECLAMO_CAMPOS_OBLIGATORIOS_ = ['cliente','dni','telefono','marca','sucursal','sector','motivo','descripcion'];

function svcReclamoValidarCampos_(datos){
  var faltantes = RECLAMO_CAMPOS_OBLIGATORIOS_.filter(function(k){ return !String(datos[k]||'').trim(); });
  if(faltantes.length) return 'Faltan campos obligatorios: '+faltantes.join(', ');
  if(!datos.telefono && !datos.email) return 'Dejá al menos un teléfono o un correo de contacto.';
  if(!datos.aceptaPrivacidad) return 'Hace falta aceptar el tratamiento de datos personales para continuar.';
  return null;
}

// Punto de entrada del formulario público. `datos` trae los campos del
// punto 3 de la especificación; `archivos` es un array de
// {nombre, tipo, base64} (ya nunca se expone un link público de Drive).
function svcReclamoPublicoCrear_(datos, archivos){
  datos = datos || {};
  var errorCampos = svcReclamoValidarCampos_(datos);
  if(errorCampos) return responseError_(errorCampos);

  // El Motor de Eventos ya dedupe por hash exacto (doble click/doble
  // submit con el mismo contenido) — ver Engine_EventEngine.gs. Acá solo
  // armamos el payload normalizado que el motor espera.
  var payload = {
    fuente: 'Formulario web',
    cliente: String(datos.cliente||'').trim(),
    dni: String(datos.dni||'').trim(),
    telefono: String(datos.telefono||'').trim(),
    email: String(datos.email||'').trim(),
    marca: String(datos.marca||'').trim(),
    modelo: String(datos.modelo||'').trim(),
    dominio: String(datos.dominio||datos.patente||'').trim(),
    sucursal: String(datos.sucursal||'').trim(),
    sector: String(datos.sector||'').trim(),
    tipoCaso: 'Reclamo de cliente',
    motivo: String(datos.motivo||'').trim(),
    descripcion: String(datos.descripcion||'').trim() + (datos.fechaInconveniente ? ('\n\nFecha aproximada del inconveniente: '+datos.fechaInconveniente) : ''),
    solucionEsperada: String(datos.solucionEsperada||'').trim(),
    prioridadSugerida: 'Media',
    origenId: ''
  };

  var resultado = recibirEvento(payload);
  if(!resultado.ok) return resultado;

  // Igual que en svcCasoCrearManual_: si la creación automática está
  // apagada (Etapa 1), el formulario público NO puede quedar esperando que
  // alguien lo confirme a mano desde la Bandeja — el cliente necesita su
  // número de reclamo YA. Así que, si el motor no generó el caso solo, lo
  // generamos acá mismo con la misma evaluación (mismo camino que usa la
  // creación manual).
  var idCaso = resultado.casoGenerado;
  if(!idCaso){
    var datosNormalizados = normalizarPayloadEvento_(payload);
    var evaluacion = evaluarEvento_(datosNormalizados);
    evaluacion.fuente = payload.fuente;
    idCaso = crearCasoDesdeEvento_(datosNormalizados, evaluacion, resultado.id);
    dbEventosMarcarProcesado_(resultado.id, idCaso, '');
  }

  // Evidencias — recién ahora que existe el caso, porque se guardan en una
  // carpeta de Drive nombrada con el ID real del caso.
  var subida = {evidencias: [], errores: []};
  if(archivos && archivos.length){
    subida = drvGuardarLoteParaCaso_(idCaso, archivos);
    if(subida.evidencias.length){
      dbCasosActualizarCampos_(idCaso, {evidencias: JSON.stringify(subida.evidencias)});
    }
  }

  var caso = dbCasosBuscarPorId_(idCaso);
  if(!caso.tokenSeguimiento){
    // Por si el caso vino de un camino viejo sin el campo — nunca debería
    // pasar con un caso recién creado, pero así queda a prueba de fallos.
    caso.tokenSeguimiento = utilNuevoTokenSeguimiento_();
    dbCasosActualizarCampos_(idCaso, {tokenSeguimiento: caso.tokenSeguimiento});
  }

  dbSeguimientosAgregar_({
    id: utilNuevoIdSeguimiento_(), casoId: idCaso, fecha: utilAhoraTexto_(),
    autor: 'Cliente', tipo: 'sistema',
    texto: 'Reclamo ingresado por el cliente a través del formulario web'+(subida.evidencias.length?(' — '+subida.evidencias.length+' archivo(s) adjunto(s)'):'')+'.',
    visibleParaReportante: true
  });

  utilNotificarEquipoCalidadReclamoNuevo_(dbCasosBuscarPorId_(idCaso));

  return responseOk_({
    id: idCaso,
    numeroReclamo: idCaso,
    token: caso.tokenSeguimiento,
    evidenciasGuardadas: subida.evidencias.length,
    erroresEvidencias: subida.errores
  });
}

// Clave del "link de equipo": se deriva del token del caso (no se guarda
// aparte). Con el link común el cliente ve solo lo que se marcó como visible
// para quien reportó; con la clave de equipo (supervisor, sector derivado) se ve
// TODO el historial y los datos de gestión del caso.
function utilClaveEquipo_(token){
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token)+'|vista-equipo');
  return raw.map(function(b){ var v=(b<0?b+256:b).toString(16); return v.length===1?'0'+v:v; }).join('').slice(0,24);
}
function esClaveEquipoValida_(caso, clave){
  return !!(clave && caso && caso.tokenSeguimiento && String(clave)===utilClaveEquipo_(caso.tokenSeguimiento));
}

// Valida el link seguro de seguimiento (caso + token [+ clave de equipo]).
// Sin clave: datos mínimos + historial visible para el cliente.
// Con clave: vista completa para el equipo.
function svcReclamoValidarToken_(idCaso, token, clave){
  if(!idCaso || !token) return responseError_('Falta el caso o el token.');
  var caso = dbCasosBuscarPorId_(idCaso);
  if(!caso || !caso.tokenSeguimiento || caso.tokenSeguimiento !== token){
    return responseError_('El enlace no es válido o ya venció.');
  }
  var equipo = esClaveEquipoValida_(caso, clave);
  var segs = equipo ? dbSeguimientosPorCaso_(idCaso) : [];   // el cliente no ve el historial: solo el estado
  var novedades = segs.map(function(x){
    return {
      fecha: x.fecha instanceof Date ? Utilities.formatDate(x.fecha, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : String(x.fecha||''),
      autor: equipo ? String(x.autor||'') : (x.autor==='Cliente' ? 'Vos' : 'Equipo de Calidad'),
      tipo: x.tipo, texto: x.texto, interno: !x.visibleParaReportante
    };
  });
  var out = {
    caso: {
      id: caso.id, marca: caso.marca, modelo: caso.modelo, estado: caso.estado,
      fechaCreacion: caso.fechaCreacion, motivo: caso.motivo,
      cliente: caso.cliente, dominio: caso.dominio   // nombre y patente/VIN para que reconozca su caso
    },
    novedades: novedades, vistaEquipo: equipo
  };
  // Lo que el propio cliente cargó en su reclamo (se muestra en su link; el DNI va enmascarado
  // porque el link suele compartirse por WhatsApp).
  var dni = String(caso.dni||''), nEvid = 0;
  try{ nEvid = JSON.parse(caso.evidencias||'[]').length; }catch(e){}
  if(equipo) out.caso.datosReclamo = {
    cliente: caso.cliente, dni: dni,
    telefono: caso.telefono, email: caso.email, marca: caso.marca, modelo: caso.modelo, dominio: caso.dominio,
    sucursal: caso.sucursal, sector: caso.sector, motivo: caso.motivo, descripcion: caso.descripcion,
    solucionEsperada: caso.solucionEsperada, evidencias: nEvid
  };
  if(equipo){
    out.caso.cliente = caso.cliente; out.caso.telefono = caso.telefono; out.caso.sucursal = caso.sucursal;
    out.caso.dominio = caso.dominio; out.caso.descripcion = caso.descripcion; out.caso.responsable = caso.responsable;
    out.caso.prioridad = caso.prioridad; out.caso.proximoPasoTexto = caso.proximoPasoTexto; out.caso.proximoPasoFecha = caso.proximoPasoFecha;
  }
  return responseOk_(out);
}

// Devuelve (y crea si hace falta) el token del caso y la clave de equipo,
// para armar desde la app el link de seguimiento o el link de equipo.
function svcCasoLinksSeguimiento_(idCaso){
  var caso = dbCasosBuscarPorId_(idCaso);
  if(!caso) return responseError_('No se encontró el caso.');
  var token = caso.tokenSeguimiento;
  if(!token){ token = utilNuevoTokenSeguimiento_(); dbCasosActualizarCampos_(idCaso, {tokenSeguimiento: token}); }
  return responseOk_({token: token, clave: utilClaveEquipo_(token)});
}

// El cliente agrega comentario y/o archivos a un caso YA EXISTENTE a
// través del link seguro — nunca crea un reclamo nuevo (punto 7 de la
// especificación).
function svcReclamoAgregarSeguimiento_(idCaso, token, comentario, archivos, clave, nombre){
  var validacion = svcReclamoValidarToken_(idCaso, token, clave);
  if(!validacion.ok) return validacion;
  var equipo = !!validacion.vistaEquipo;
  var autor = equipo ? (String(nombre||'').trim() || 'Equipo') + ' (link de equipo)' : 'Cliente';
  if(!comentario && (!archivos || !archivos.length)) return responseError_('Escribí un comentario o adjuntá al menos un archivo.');

  var subida = {evidencias: [], errores: []};
  if(archivos && archivos.length){
    subida = drvGuardarLoteParaCaso_(idCaso, archivos);
    if(subida.evidencias.length){
      var casoActual = dbCasosBuscarPorId_(idCaso);
      var previas = [];
      try{ previas = JSON.parse(casoActual.evidencias||'[]'); }catch(e){}
      dbCasosActualizarCampos_(idCaso, {evidencias: JSON.stringify(previas.concat(subida.evidencias))});
    }
  }

  if(comentario && comentario.trim()){
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: idCaso, fecha: utilAhoraTexto_(),
      autor: autor, tipo: 'comentario', texto: comentario.trim(), visibleParaReportante: !equipo
    });
  }
  if(subida.evidencias.length){
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: idCaso, fecha: utilAhoraTexto_(),
      autor: autor, tipo: 'sistema',
      texto: (equipo ? autor : 'El cliente')+' agregó '+subida.evidencias.length+' archivo(s) adicionales a través del link de seguimiento.',
      visibleParaReportante: !equipo
    });
  }
  dbCasosActualizarCampos_(idCaso, {}); // toca fechaUltimaActualizacion

  utilNotificarResponsableNuevaInfoCliente_(dbCasosBuscarPorId_(idCaso));

  return responseOk_({evidenciasGuardadas: subida.evidencias.length, erroresEvidencias: subida.errores});
}
