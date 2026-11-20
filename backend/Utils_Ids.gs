/**
 * Utils_Ids.gs
 * IDs legibles (PA-2026-1050 estilo), usando los contadores que viven en
 * la hoja Configuracion — mismo criterio que el módulo de Casos de Planning.
 */

function utilNuevoIdCaso_(){
  var year = new Date().getFullYear();
  var n = dbConfigSiguienteContador_(CONFIG_KEYS.CONTADOR_CASOS);
  return 'GC-' + year + '-' + (1000 + n);
}
function utilNuevoIdEvento_(){
  var n = dbConfigSiguienteContador_(CONFIG_KEYS.CONTADOR_EVENTOS);
  return 'EV-' + n;
}
function utilNuevoIdSeguimiento_(){
  var n = dbConfigSiguienteContador_(CONFIG_KEYS.CONTADOR_SEGUIMIENTOS);
  return 'SG-' + n;
}
function utilNuevoIdTimeline_(){
  var n = dbConfigSiguienteContador_(CONFIG_KEYS.CONTADOR_TIMELINE);
  return 'TL-' + n;
}
function utilNuevoIdAnalisis_(){
  var n = dbConfigSiguienteContador_(CONFIG_KEYS.CONTADOR_ANALISIS);
  return 'AN-' + n;
}
function utilNuevoIdActa_(){
  var year = new Date().getFullYear();
  var n = dbConfigSiguienteContador_(CONFIG_KEYS.CONTADOR_ACTAS);
  return 'ACTA-' + year + '-' + n;
}

// Token de seguimiento para el link seguro de "agregar información" que se
// le comparte al cliente — no es una contraseña ni un login, solo evita que
// cualquiera que adivine un ID de caso pueda escribirle al expediente.
function utilNuevoTokenSeguimiento_(){
  return Utilities.getUuid().replace(/-/g,'');
}
function utilNuevoIdCompromiso_(){
  var n = dbConfigSiguienteContador_(CONFIG_KEYS.CONTADOR_COMPROMISOS);
  return 'CO-' + n;
}
