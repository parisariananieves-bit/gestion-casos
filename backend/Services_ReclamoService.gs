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

// Valida el link seguro de seguimiento (caso + token) sin exponer datos de
// otros reclamos — solo lo mínimo para que la pantalla de seguimiento
// pueda mostrar "Caso GC-2026-1050 — Chevrolet — estado: en análisis".
function svcReclamoValidarToken_(idCaso, token){
  if(!idCaso || !token) return responseError_('Falta el caso o el token.');
  var caso = dbCasosBuscarPorId_(idCaso);
  if(!caso || !caso.tokenSeguimiento || caso.tokenSeguimiento !== token){
    return responseError_('El enlace no es válido o ya venció.');
  }
  return responseOk_({
    caso: {
      id: caso.id, marca: caso.marca, modelo: caso.modelo, estado: caso.estado,
      fechaCreacion: caso.fechaCreacion, motivo: caso.motivo
    }
  });
}

// El cliente agrega comentario y/o archivos a un caso YA EXISTENTE a
// través del link seguro — nunca crea un reclamo nuevo (punto 7 de la
// especificación).
function svcReclamoAgregarSeguimiento_(idCaso, token, comentario, archivos){
  var validacion = svcReclamoValidarToken_(idCaso, token);
  if(!validacion.ok) return validacion;
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
      autor: 'Cliente', tipo: 'comentario', texto: comentario.trim(), visibleParaReportante: true
    });
  }
  if(subida.evidencias.length){
    dbSeguimientosAgregar_({
      id: utilNuevoIdSeguimiento_(), casoId: idCaso, fecha: utilAhoraTexto_(),
      autor: 'Cliente', tipo: 'sistema',
      texto: 'El cliente agregó '+subida.evidencias.length+' archivo(s) adicionales a través del link de seguimiento.',
      visibleParaReportante: true
    });
  }
  dbCasosActualizarCampos_(idCaso, {}); // toca fechaUltimaActualizacion

  utilNotificarResponsableNuevaInfoCliente_(dbCasosBuscarPorId_(idCaso));

  return responseOk_({evidenciasGuardadas: subida.evidencias.length, erroresEvidencias: subida.errores});
}
