/**
 * Config.gs
 * Constantes centrales de Gestión de Casos — Grupo París / Área Calidad.
 * Arquitectura v3 (Motor de Eventos), cerrada y aprobada.
 *
 * Nada de lo que hay acá son "reglas de negocio" editables por el equipo —
 * eso vive en la hoja Configuracion (ver Database_Configuracion.gs). Esto son
 * solo los nombres fijos de hojas y columnas que el código necesita para
 * ubicarse en la planilla.
 */

// Nombre del spreadsheet que crea SETUP_CrearBaseDeDatos.gs
var NOMBRE_SPREADSHEET = 'Gestión de Casos — Grupo París';

// Nombres de hojas (pestañas) — fijos, no se tocan desde la web
var HOJAS_GC = {
  CASOS: 'Casos',
  EVENTOS: 'Eventos',
  TIMELINE: 'Timeline',
  SEGUIMIENTOS: 'Seguimientos',
  CONFIGURACION: 'Configuracion',
  CATALOGOS: 'Catalogos',
  USUARIOS: 'Usuarios',
  AUDITORIAS: 'Auditorias', // placeholder — se completa en una etapa futura
  ANALISIS_CAUSA_RAIZ: 'AnalisisCausaRaiz',
  ACTAS: 'Actas',
  COMPROMISOS: 'Compromisos'
};

// Análisis de causa raíz (5 Porqués) — uno por caso, editable.
var COLUMNAS_ANALISIS_CAUSA_RAIZ = [
  {k:'id', h:'ID'},
  {k:'casoId', h:'Caso ID'},
  {k:'fecha', h:'Fecha'},
  {k:'autor', h:'Autor'},
  {k:'problema', h:'Problema (qué pasó)'},
  {k:'porque1', h:'Por qué 1'},
  {k:'porque2', h:'Por qué 2'},
  {k:'porque3', h:'Por qué 3'},
  {k:'porque4', h:'Por qué 4'},
  {k:'porque5', h:'Por qué 5'},
  {k:'causaRaiz', h:'Causa raíz identificada'},
  {k:'planAccion', h:'Plan de acción'},
  {k:'responsablePlan', h:'Responsable del plan'},
  {k:'fechaLimitePlan', h:'Fecha límite del plan'},
  {k:'estadoPlan', h:'Estado del plan'} // pendiente | en curso | completado
];

// Minutas de reunión (Etapa 5 — antes "Actas", ampliado). Se pueden
// vincular a uno o más casos reales (por ID, nunca texto libre) y cada
// caso tratado tiene sus propios compromisos en la hoja Compromisos.
var COLUMNAS_ACTAS = [
  {k:'id', h:'ID'},
  {k:'fecha', h:'Fecha'},
  {k:'titulo', h:'Título'},
  {k:'asistentes', h:'Asistentes'},
  {k:'temas', h:'Temas tratados'},
  {k:'casosVinculados', h:'Casos vinculados (separados por coma)'},
  {k:'proximosPasos', h:'Próximos pasos'},
  {k:'creadoPor', h:'Creado por'},
  // --- Agregado (Etapa 5) ---
  {k:'hora', h:'Hora'},
  {k:'responsableReunion', h:'Responsable de la reunión'},
  {k:'objetivo', h:'Objetivo / tema principal'}
];

// Compromisos (Etapa 5) — uno por cada caso tratado en una minuta. Es lo
// que convierte "se habló de este caso" en algo con dueño y fecha límite,
// y lo que alimenta la vista de seguimiento de compromisos.
var COLUMNAS_COMPROMISOS = [
  {k:'id', h:'ID'},
  {k:'actaId', h:'Acta ID'},
  {k:'casoId', h:'Caso ID'},
  {k:'resumen', h:'Resumen de la situación'},
  {k:'problema', h:'Problema identificado'},
  {k:'analisis', h:'Análisis realizado'},
  {k:'decision', h:'Decisión tomada'},
  {k:'accion', h:'Acción acordada'},
  {k:'responsableCompromiso', h:'Responsable del compromiso'},
  {k:'fechaLimite', h:'Fecha límite'},
  {k:'observaciones', h:'Observaciones'},
  {k:'estado', h:'Estado'},          // pendiente | cumplido  ("vencido" se calcula, no se guarda)
  {k:'fechaCreacion', h:'Fecha de creación'},
  {k:'fechaCumplido', h:'Fecha de cumplimiento'}
];

// Columnas de la hoja Casos — el orden acá DEBE coincidir con el orden real
// en la hoja. Si se agrega una columna, se agrega al FINAL de este array,
// nunca en el medio (mismo criterio que Planning para no correr columnas).
var COLUMNAS_CASOS = [
  {k:'id', h:'ID'},
  {k:'fechaCreacion', h:'Fecha Creación'},
  {k:'estado', h:'Estado'},                 // nuevo | analisis | esperando | derivado | resuelto | cerrado
  {k:'prioridad', h:'Prioridad'},           // alta | media | baja
  {k:'cliente', h:'Cliente'},
  {k:'dni', h:'DNI'},
  {k:'telefono', h:'Teléfono'},
  {k:'email', h:'Email'},
  {k:'marca', h:'Marca'},
  {k:'modelo', h:'Modelo'},
  {k:'dominio', h:'Dominio / VIN'},
  {k:'sucursal', h:'Sucursal'},
  {k:'sector', h:'Sector que reporta'},
  {k:'unidad', h:'Unidad de negocio'},      // Venta Directa | Plan de Ahorro | Postventa / CSI | Venta
  {k:'tipoCaso', h:'Tipo de Caso'},
  {k:'motivo', h:'Motivo'},
  {k:'descripcion', h:'Descripción'},
  {k:'responsable', h:'Responsable'},
  {k:'fuente', h:'Fuente'},                 // Manual | Automático | Planning | NPS | Mini encuesta | WhatsApp | Mail
  {k:'origenId', h:'Origen — ID externo'},  // ej: código de caso de Planning (PA-2026-1050)
  {k:'proximaAccion', h:'Próxima Acción'},
  {k:'fechaUltimaActualizacion', h:'Última Actualización'},
  {k:'slaVencimiento', h:'SLA — Vencimiento'},
  {k:'estadoSync', h:'Estado Sync'},        // pendiente | sincronizado | error
  {k:'defensaConsumidor', h:'Defensa del Consumidor', bool:true},
  {k:'expedienteRelacionado', h:'Expediente Relacionado'},
  {k:'creadoPor', h:'Creado Por'},
  {k:'cerradoFecha', h:'Fecha de Cierre'},
  {k:'cerradoMotivo', h:'Motivo de Cierre'},
  // --- Agregado: Ingreso automático de reclamos de clientes (formulario
  // público). Van al FINAL, mismo criterio que el resto de este archivo. ---
  {k:'solucionEsperada', h:'Solución esperada (cliente)'},
  {k:'evidencias', h:'Evidencias (JSON)'},               // [{nombre,tipo,tamano,driveId,url,fecha}]
  {k:'tokenSeguimiento', h:'Token de seguimiento'},        // para el link seguro de "agregar info"
  {k:'fechaPrimerContacto', h:'Fecha Primer Contacto'},    // se completa en la 1ra asignación/novedad
  // --- Agregado: Dashboard ejecutivo (Etapa 4) — casos reabiertos ---
  {k:'reabierto', h:'Reabierto alguna vez', bool:true}
];

// Columnas de la hoja Eventos — todo lo que entra al sistema pasa por acá
// ANTES de convertirse (o no) en un caso. Ver Engine_EventEngine.gs.
var COLUMNAS_EVENTOS = [
  {k:'id', h:'ID Evento'},
  {k:'fechaRecepcion', h:'Fecha Recepción'},
  {k:'fuente', h:'Fuente'},
  {k:'vin', h:'VIN / Patente'},
  {k:'cliente', h:'Cliente / Contacto'},
  {k:'payloadOriginal', h:'Payload Original (JSON)'},
  {k:'datosNormalizados', h:'Datos Normalizados (JSON)'},
  {k:'hashEvento', h:'Hash de Evento'},
  {k:'procesado', h:'Procesado', bool:true},
  {k:'casoGenerado', h:'Caso Generado'},
  {k:'motivoDescarte', h:'Motivo de Descarte'}
];

// Timeline: historial por VEHÍCULO (VIN), cruza todos los casos de ese auto.
// Distinto de Seguimientos, que es historial POR CASO.
var COLUMNAS_TIMELINE = [
  {k:'id', h:'ID'},
  {k:'vin', h:'VIN / Patente'},
  {k:'fecha', h:'Fecha'},
  {k:'tipoEvento', h:'Tipo de Evento'},
  {k:'descripcion', h:'Descripción'},
  {k:'casoRelacionado', h:'Caso Relacionado'},
  {k:'fuente', h:'Fuente'}
];

// Seguimientos: historial de novedades DENTRO de un caso (comentarios,
// cambios de estado, asignaciones, etc.)
var COLUMNAS_SEGUIMIENTOS = [
  {k:'id', h:'ID'},
  {k:'casoId', h:'Caso ID'},
  {k:'fecha', h:'Fecha'},
  {k:'autor', h:'Autor'},
  {k:'tipo', h:'Tipo'},           // comentario | cambio_estado | asignacion | cambio_prioridad | sistema
  {k:'texto', h:'Texto'},
  {k:'visibleParaReportante', h:'Visible para quien reportó', bool:true}
];

var COLUMNAS_USUARIOS = [
  {k:'nombre', h:'Nombre'},
  {k:'usuario', h:'Usuario'},
  {k:'passwordHash', h:'PasswordHash'},
  {k:'salt', h:'Salt'},
  {k:'rol', h:'Rol'},          // calidad | sector | referente
  {k:'sector', h:'Sector'},
  {k:'email', h:'Email'},
  {k:'activo', h:'Activo', bool:true}
];

// Claves que se guardan en la hoja Configuracion (fila por fila, clave/valor).
// Los contadores viven ACÁ, no en propiedades del script, para que sean
// visibles/auditables por cualquiera que abra la planilla.
var CONFIG_KEYS = {
  CREAR_CASOS_AUTOMATICO: 'CREAR_CASOS_AUTOMATICO', // 'false' por defecto — ver README
  CONTADOR_CASOS: 'CONTADOR_CASOS',
  CONTADOR_EVENTOS: 'CONTADOR_EVENTOS',
  CONTADOR_SEGUIMIENTOS: 'CONTADOR_SEGUIMIENTOS',
  CONTADOR_TIMELINE: 'CONTADOR_TIMELINE',
  CONTADOR_ANALISIS: 'CONTADOR_ANALISIS',
  CONTADOR_ACTAS: 'CONTADOR_ACTAS',
  CONTADOR_COMPROMISOS: 'CONTADOR_COMPROMISOS',
  SLA_HORAS_ALTA: 'SLA_HORAS_ALTA',
  SLA_HORAS_MEDIA: 'SLA_HORAS_MEDIA',
  SLA_HORAS_BAJA: 'SLA_HORAS_BAJA',
  NOTIFICAR_EMAIL_CASO_NUEVO: 'NOTIFICAR_EMAIL_CASO_NUEVO',
  // --- Agregado: reclamos por formulario público ---
  EMAILS_EQUIPO_CALIDAD: 'EMAILS_EQUIPO_CALIDAD',       // lista separada por coma, se notifica un reclamo nuevo
  DRIVE_CARPETA_RECLAMOS_ID: 'DRIVE_CARPETA_RECLAMOS_ID', // se completa sola la primera vez (caché)
  URL_FORMULARIO_PUBLICO: 'URL_FORMULARIO_PUBLICO',     // ej: https://gestion-casos.vercel.app/reclamo.html
  URL_SEGUIMIENTO_PUBLICO: 'URL_SEGUIMIENTO_PUBLICO'    // ej: https://gestion-casos.vercel.app/seguimiento.html
};

// Tamaño máximo por archivo adjunto del formulario público (bytes) y
// formatos permitidos — se valida tanto en el cliente como acá, porque
// el cliente se puede evitar.
var RECLAMO_ARCHIVO_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
var RECLAMO_MIME_PERMITIDOS = [
  'image/jpeg','image/jpg','image/png','image/webp',
  'video/mp4',
  'application/pdf'
];
var RECLAMO_MAX_ARCHIVOS = 8;

function getSS_GC(){
  return SpreadsheetApp.getActiveSpreadsheet();
}
