/**
 * Engine_ReglasEvaluator.gs
 * Reglas de negocio que el Motor de Eventos consulta antes de crear un caso:
 *   - ¿Este cliente/VIN ya tiene casos previos? (coincidencia por DNI, VIN o nombre)
 *   - ¿Corresponde marcarlo para seguimiento prioritario / Defensa del Consumidor?
 *   - ¿Qué prioridad sugerir según palabras clave del motivo?
 *
 * Vive separado del EventEngine a propósito: acá se puede seguir agregando
 * reglas sin tocar el flujo general de recepción de eventos.
 */

function evaluarEvento_(datos){
  var coincidencias = buscarCoincidencias_(datos);
  var prioridadSugerida = sugerirPrioridad_(datos, coincidencias);
  var seguimientoPrioritario = coincidencias.length >= 2; // 2+ casos previos = seguimiento especial

  return {
    fuente: datos.fuente,
    coincidencias: coincidencias,
    prioridadSugerida: prioridadSugerida,
    seguimientoPrioritario: seguimientoPrioritario,
    expedienteRelacionado: coincidencias.length ? coincidencias[0].id : ''
  };
}

// Coincidencia por DNI exacto, VIN exacto o nombre (contiene) — mismo
// criterio que ya se usa en Planning para el módulo de Reportar Caso.
function buscarCoincidencias_(datos){
  var dni = utilNormalizarTexto_(datos.dni);
  var vin = utilNormalizarTexto_(datos.vin);
  var cliente = utilNormalizarTexto_(datos.cliente);
  if(!dni && !vin && !cliente) return [];

  return dbCasosListarTodos_().filter(function(c){
    var cDni = utilNormalizarTexto_(c.dni);
    var cVin = utilNormalizarTexto_(c.dominio);
    var cCliente = utilNormalizarTexto_(c.cliente);
    if(dni && cDni && cDni===dni) return true;
    if(vin && cVin && cVin===vin) return true;
    if(cliente && cCliente && cCliente===cliente) return true;
    return false;
  });
}

// Palabras clave simples en motivo/descripción que ameritan prioridad alta.
// Es deliberadamente básico en esta etapa — se puede reemplazar por algo
// más sofisticado (o editable desde Configuración) más adelante.
var PALABRAS_PRIORIDAD_ALTA_ = ['accidente','seguridad','freno','humo','incendio','urgente','defensa del consumidor','abogado','denuncia'];

function sugerirPrioridad_(datos, coincidencias){
  var texto = (String(datos.motivo||'') + ' ' + String(datos.descripcion||'')).toLowerCase();
  var tieneKeywordAlta = PALABRAS_PRIORIDAD_ALTA_.some(function(k){ return texto.indexOf(k)>-1; });
  if(tieneKeywordAlta) return 'Alta';
  if(coincidencias.length >= 2) return 'Alta'; // reincidencia = prioridad alta
  if(coincidencias.length === 1) return 'Media';
  return datos.prioridadSugerida || 'Media';
}
