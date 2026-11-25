/**
 * SETUP_CrearBaseDeDatos.gs
 * Correr UNA SOLA VEZ, a mano, desde el editor de Apps Script, para dejar
 * armada toda la base de datos (hojas + encabezados + configuración inicial
 * + catálogos + usuario admin). No borra nada si se vuelve a correr —
 * cada hoja se crea solo si no existe todavía.
 */
function crearBaseDeDatosGestionCasos(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename(NOMBRE_SPREADSHEET);

  getHojaCasos_GC();
  getHojaEventos_();
  getHojaTimeline_();
  getHojaSeguimientos_();
  getHojaConfiguracion_();
  getHojaCatalogos_();
  getHojaUsuarios_GC();
  getHojaActas_();
  getHojaCompromisos_();

  dbConfigInicializar_();

  // Orden prolijo de pestañas
  var orden = [HOJAS_GC.CASOS, HOJAS_GC.EVENTOS, HOJAS_GC.TIMELINE, HOJAS_GC.SEGUIMIENTOS,
    HOJAS_GC.CATALOGOS, HOJAS_GC.CONFIGURACION, HOJAS_GC.USUARIOS, HOJAS_GC.ACTAS, HOJAS_GC.COMPROMISOS];
  orden.forEach(function(nombre, i){
    var sh = ss.getSheetByName(nombre);
    if(sh){ ss.setActiveSheet(sh); ss.moveActiveSheet(i+1); }
  });

  ss.toast('Base de datos de Gestión de Casos creada. Usuario inicial: admin / Calidad2026 (cambiarla apenas entres).');
}

// Si no podés entrar: elegí esta función en el editor de Apps Script y tocá
// "Ejecutar". Deja el usuario "admin" activo, con rol Calidad y la contraseña
// Calidad2026 (si no existía, lo crea). Entrá y cambiala enseguida desde Equipo.
function resetearClaveAdmin(){
  var hoja = getHojaUsuarios_GC();
  var salt = Utilities.getUuid();
  var hash = hashPassword_GC('Calidad2026', salt);
  var u = dbUsuariosBuscar_('admin');
  if(u){
    hoja.getRange(u.fila, 3, 1, 2).setValues([[hash, salt]]);   // PasswordHash, Salt
    hoja.getRange(u.fila, 5).setValue('calidad');                // Rol
    hoja.getRange(u.fila, 8).setValue(true);                     // Activo
  } else {
    hoja.appendRow(['Administrador','admin',hash,salt,'calidad','Calidad','',true]);
  }
  Logger.log('Listo: usuario admin / contraseña Calidad2026');
}
