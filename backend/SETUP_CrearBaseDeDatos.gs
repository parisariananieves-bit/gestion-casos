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

  dbConfigInicializar_();

  // Orden prolijo de pestañas
  var orden = [HOJAS_GC.CASOS, HOJAS_GC.EVENTOS, HOJAS_GC.TIMELINE, HOJAS_GC.SEGUIMIENTOS,
    HOJAS_GC.CATALOGOS, HOJAS_GC.CONFIGURACION, HOJAS_GC.USUARIOS];
  orden.forEach(function(nombre, i){
    var sh = ss.getSheetByName(nombre);
    if(sh){ ss.setActiveSheet(sh); ss.moveActiveSheet(i+1); }
  });

  ss.toast('Base de datos de Gestión de Casos creada. Usuario inicial: admin / Calidad2026 (cambiarla apenas entres).');
}
