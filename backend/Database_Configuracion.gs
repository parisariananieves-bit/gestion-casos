/**
 * Database_Configuracion.gs
 * Hoja "Configuracion": clave/valor, una fila por parámetro. Todo lo que acá
 * se guarda es una REGLA DE NEGOCIO editable sin tocar código (desde la web,
 * pantalla Administración > Configuración — se completa en Etapa 2).
 *
 * Los contadores para generar IDs (CONTADOR_CASOS, etc.) también viven acá,
 * así quedan a la vista de cualquiera que abra la planilla — nada de estado
 * escondido en PropertiesService.
 */

function getHojaConfiguracion_(){
  var ss = getSS_GC();
  var hoja = ss.getSheetByName(HOJAS_GC.CONFIGURACION);
  if(!hoja){
    hoja = ss.insertSheet(HOJAS_GC.CONFIGURACION);
    hoja.appendRow(['Clave','Valor','Descripción']);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function dbConfigLeerTodo_(){
  var hoja = getHojaConfiguracion_();
  var datos = hoja.getDataRange().getValues();
  var out = {};
  for(var i=1;i<datos.length;i++){
    if(datos[i][0]) out[datos[i][0]] = datos[i][1];
  }
  return out;
}

function dbConfigLeer_(clave, valorDefault){
  var hoja = getHojaConfiguracion_();
  var datos = hoja.getDataRange().getValues();
  for(var i=1;i<datos.length;i++){
    if(datos[i][0]===clave) return datos[i][1];
  }
  return valorDefault;
}

function dbConfigEscribir_(clave, valor, descripcion){
  var hoja = getHojaConfiguracion_();
  var datos = hoja.getDataRange().getValues();
  for(var i=1;i<datos.length;i++){
    if(datos[i][0]===clave){
      hoja.getRange(i+1,2).setValue(valor);
      if(descripcion) hoja.getRange(i+1,3).setValue(descripcion);
      return;
    }
  }
  hoja.appendRow([clave, valor, descripcion||'']);
}

// Contador atómico simple. Google Sheets no tiene locking real accesible
// fácil desde Apps Script para este caso, así que usamos LockService para
// evitar que dos ejecuciones simultáneas generen el mismo número.
function dbConfigSiguienteContador_(clave){
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    var actual = Number(dbConfigLeer_(clave, 0)) || 0;
    var siguiente = actual + 1;
    dbConfigEscribir_(clave, siguiente);
    return siguiente;
  } finally {
    lock.releaseLock();
  }
}

function dbConfigDefaults_(){
  return {
    CREAR_CASOS_AUTOMATICO: false,
    CONTADOR_CASOS: 0,
    CONTADOR_EVENTOS: 0,
    CONTADOR_SEGUIMIENTOS: 0,
    CONTADOR_TIMELINE: 0,
    CONTADOR_ANALISIS: 0,
    CONTADOR_ACTAS: 0,
    CONTADOR_COMPROMISOS: 0,
    SLA_HORAS_ALTA: 24,
    SLA_HORAS_MEDIA: 72,
    SLA_HORAS_BAJA: 168,
    NOTIFICAR_EMAIL_CASO_NUEVO: '',
    EMAILS_EQUIPO_CALIDAD: '',
    DRIVE_CARPETA_RECLAMOS_ID: '',
    URL_FORMULARIO_PUBLICO: '',
    URL_SEGUIMIENTO_PUBLICO: ''
  };
}

function dbConfigInicializar_(){
  var defaults = dbConfigDefaults_();
  var actual = dbConfigLeerTodo_();
  Object.keys(defaults).forEach(function(k){
    if(actual[k]===undefined || actual[k]==='') dbConfigEscribir_(k, defaults[k]);
  });
}
