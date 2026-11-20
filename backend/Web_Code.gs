/**
 * Web_Code.gs
 * API JSON pura — mismo patrón que Planning de Entregas (doGet para leer,
 * doPost para escribir, todo enrutado por "action"). Sin HtmlService: el
 * frontend real vive aparte (index.html, deployado en Vercel), y le pega a
 * esta URL de Apps Script como backend, igual que ya funciona Planning.
 */

function doGet(e){
  var action = e && e.parameter && e.parameter.action;
  var result;
  try{
    if(action==='casos') result = apiListarCasos(e.parameter);
    else if(action==='caso') result = apiObtenerCaso(e.parameter);
    else if(action==='buscarCliente') result = apiBuscarClienteCaso(e.parameter);
    else if(action==='timelinePorVin') result = apiTimelinePorVin(e.parameter);
    else if(action==='eventosPendientes') result = apiEventosPendientes(e.parameter);
    else if(action==='dashboard') result = apiObtenerResumenDashboard();
    else if(action==='config') result = apiObtenerConfig();
    else if(action==='usuariosActivos') result = apiUsuariosActivosParaAsignar();
    else if(action==='reporte') result = apiObtenerReporte(e.parameter);
    else if(action==='reporteDefensaConsumidor') result = apiObtenerReporteDefensaConsumidor();
    else if(action==='analisisCausaRaiz') result = apiObtenerAnalisisCausaRaiz(e.parameter);
    else if(action==='actas') result = apiListarActas();
    else result = responseOk_({mensaje:'API Gestión de Casos funcionando'});
  }catch(err){
    result = responseError_(err);
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e){
  var body = {};
  try{ body = JSON.parse(e.postData.contents); }catch(err){}
  var action = body.action;
  var p = body.params || {};
  var result;
  try{
    if(action==='login') result = apiLogin(p);
    else if(action==='crearCaso') result = apiCrearCaso(p);
    else if(action==='cambiarEstadoCaso') result = apiCambiarEstadoCaso(p);
    else if(action==='asignarCaso') result = apiAsignarCaso(p);
    else if(action==='derivarCaso') result = apiDerivarCaso(p);
    else if(action==='cambiarPrioridadCaso') result = apiCambiarPrioridadCaso(p);
    else if(action==='comentarCaso') result = apiComentarCaso(p);
    else if(action==='toggleDefensaConsumidor') result = apiToggleDefensaConsumidor(p);
    else if(action==='guardarAnalisisCausaRaiz') result = apiGuardarAnalisisCausaRaiz(p);
    else if(action==='crearActa') result = apiCrearActa(p);
    else if(action==='confirmarEventoComoCaso') result = apiConfirmarEventoComoCaso(p);
    else if(action==='descartarEvento') result = apiDescartarEvento(p);
    else if(action==='actualizarConfig') result = apiActualizarConfig(p);
    else if(action==='agregarCatalogoItem') result = apiAgregarCatalogoItem(p);
    else if(action==='eliminarCatalogoItem') result = apiEliminarCatalogoItem(p);
    else if(action==='crearUsuario') result = apiCrearUsuario(p);
    else if(action==='editarUsuario') result = apiEditarUsuario(p);
    else if(action==='desactivarUsuario') result = apiDesactivarUsuario(p);
    else if(action==='importarUsuarios') result = apiImportarUsuarios(p);
    else if(action==='listarUsuarios') result = apiListarUsuarios(p);
    else if(action==='recibirEvento') result = recibirEvento(p); // conector genérico (Etapa 2)
    // --- Agregado: formulario público de reclamos — SIN login, a propósito ---
    else if(action==='reclamoPublico') result = apiReclamoPublicoCrear(p);
    else if(action==='reclamoValidarToken') result = apiReclamoValidarToken(p);
    else if(action==='reclamoSeguimiento') result = apiReclamoSeguimientoAgregar(p);
    else result = responseError_('Acción desconocida: '+action);
  }catch(err){
    result = responseError_(err);
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
