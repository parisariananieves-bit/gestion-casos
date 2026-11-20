/**
 * Services_DriveEvidenciaService.gs
 * Almacenamiento de evidencias (fotos/videos/PDF) del formulario público de
 * reclamos. Todo vive en UNA carpeta de Drive creada por este mismo script,
 * compartida solo con el equipo de Calidad (nunca con "cualquiera con el
 * link") — cumple el punto 10 de la especificación ("no exponer enlaces
 * públicos de Google Drive").
 *
 * Estructura en Drive:
 *   Evidencias — Reclamos Gestión Calidad/
 *     GC-2026-1050/
 *       foto1.jpg
 *       presupuesto.pdf
 *
 * La carpeta raíz se crea UNA sola vez (la primera vez que llega un
 * reclamo) y su ID se cachea en Configuracion (DRIVE_CARPETA_RECLAMOS_ID),
 * así no se busca por nombre en cada ejecución.
 */

var NOMBRE_CARPETA_RAIZ_RECLAMOS_ = 'Evidencias — Reclamos Gestión Calidad';

function drvObtenerCarpetaRaizReclamos_(){
  var idGuardado = dbConfigLeer_(CONFIG_KEYS.DRIVE_CARPETA_RECLAMOS_ID, '');
  if(idGuardado){
    try{ return DriveApp.getFolderById(idGuardado); }catch(e){ /* el ID guardado ya no existe, se re-crea abajo */ }
  }
  // Primero busca por si ya existe (evita duplicar si se corrió sin el
  // caché, ej. en una migración), después la crea.
  var it = DriveApp.getFoldersByName(NOMBRE_CARPETA_RAIZ_RECLAMOS_);
  var carpeta = it.hasNext() ? it.next() : DriveApp.createFolder(NOMBRE_CARPETA_RAIZ_RECLAMOS_);
  dbConfigEscribir_(CONFIG_KEYS.DRIVE_CARPETA_RECLAMOS_ID, carpeta.getId(), 'Carpeta raíz de evidencias — no tocar a mano.');
  drvCompartirConEquipoCalidad_(carpeta);
  return carpeta;
}

// Comparte la carpeta RAÍZ (nunca archivos individuales ni con "cualquiera
// con el link") con los emails configurados en EMAILS_EQUIPO_CALIDAD. Si
// todavía no se configuró ningún email, no comparte con nadie — sigue
// siendo privada, solo visible para quien tenga acceso a este Drive/cuenta
// de servicio, hasta que se complete esa configuración.
function drvCompartirConEquipoCalidad_(carpeta){
  var emails = String(dbConfigLeer_(CONFIG_KEYS.EMAILS_EQUIPO_CALIDAD, '') || '')
    .split(',').map(function(e){ return e.trim(); }).filter(Boolean);
  emails.forEach(function(email){
    try{ carpeta.addEditor(email); }catch(e){ /* email inválido o ya comparte — se ignora */ }
  });
}

function drvCarpetaParaCaso_(idCaso){
  var raiz = drvObtenerCarpetaRaizReclamos_();
  var it = raiz.getFoldersByName(idCaso);
  if(it.hasNext()) return it.next();
  return raiz.createFolder(idCaso);
}

function drvValidarArchivo_(archivo){
  if(!archivo || !archivo.base64 || !archivo.nombre) return 'Archivo incompleto.';
  var mime = String(archivo.tipo||'').toLowerCase();
  if(RECLAMO_MIME_PERMITIDOS.indexOf(mime)===-1) return 'Formato no permitido: '+(archivo.tipo||'desconocido')+'.';
  // El tamaño en base64 es ~4/3 del tamaño real — chequeo aproximado antes
  // de decodificar (decodificar algo gigante primero sería innecesario).
  var bytesAprox = Math.floor(archivo.base64.length * 0.75);
  if(bytesAprox > RECLAMO_ARCHIVO_MAX_BYTES) return 'El archivo "'+archivo.nombre+'" supera el tamaño máximo permitido (15 MB).';
  return null;
}

// Decodifica y guarda un archivo (formato {nombre, tipo, base64}) dentro de
// la carpeta del caso. Devuelve la referencia que se guarda en el campo
// "evidencias" del caso — SIN hacerla pública: el acceso queda limitado a
// quien tenga permiso sobre la carpeta (equipo de Calidad).
function drvGuardarArchivoBase64_(carpeta, archivo){
  var limpio = String(archivo.base64).replace(/^data:[^,]+,/, '');
  var bytes = Utilities.base64Decode(limpio);
  var blob = Utilities.newBlob(bytes, archivo.tipo, archivo.nombre);
  var file = carpeta.createFile(blob);
  // Hereda los permisos de la carpeta (no se toca el sharing del archivo
  // individual — sigue sin haber ningún enlace "público" expuesto).
  return {
    nombre: archivo.nombre,
    tipo: archivo.tipo,
    tamano: bytes.length,
    driveId: file.getId(),
    url: file.getUrl(), // solo abre para quien ya tiene acceso a la carpeta
    fecha: utilAhoraTexto_()
  };
}

// Guarda un lote de archivos para un caso ya existente (usado tanto en la
// creación del reclamo como en el link de "agregar información adicional").
// Devuelve {evidencias, errores} — nunca tira si un archivo individual
// falla validación: simplemente lo deja afuera y lo reporta en errores.
function drvGuardarLoteParaCaso_(idCaso, archivos){
  var out = {evidencias: [], errores: []};
  if(!archivos || !archivos.length) return out;
  if(archivos.length > RECLAMO_MAX_ARCHIVOS){
    out.errores.push('Se permiten como máximo '+RECLAMO_MAX_ARCHIVOS+' archivos por envío.');
    archivos = archivos.slice(0, RECLAMO_MAX_ARCHIVOS);
  }
  var carpeta = drvCarpetaParaCaso_(idCaso);
  archivos.forEach(function(archivo){
    var err = drvValidarArchivo_(archivo);
    if(err){ out.errores.push(err); return; }
    try{
      out.evidencias.push(drvGuardarArchivoBase64_(carpeta, archivo));
    }catch(e){
      out.errores.push('No se pudo guardar "'+(archivo.nombre||'archivo')+'": '+e.message);
    }
  });
  return out;
}
