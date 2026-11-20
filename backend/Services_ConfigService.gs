/**
 * Services_ConfigService.gs
 */
function svcConfigObtener_(){
  return responseOk_({config: dbConfigLeerTodo_(), catalogos: dbCatalogosLeerTodo_()});
}
function svcConfigActualizar_(clave, valor){
  if(Object.values(CONFIG_KEYS).indexOf(clave)===-1) return responseError_('Clave de configuración desconocida.');
  dbConfigEscribir_(clave, valor);
  return responseOk_({});
}
function svcCatalogoAgregarItem_(nombre, valor){
  if(!nombre || !valor || !String(valor).trim()) return responseError_('Faltan datos.');
  dbCatalogoAgregarItem_(nombre, String(valor).trim());
  return responseOk_({});
}
function svcCatalogoEliminarItem_(nombre, valor){
  var ok = dbCatalogoEliminarItem_(nombre, valor);
  return ok ? responseOk_({}) : responseError_('No se encontró ese valor en el catálogo.');
}
