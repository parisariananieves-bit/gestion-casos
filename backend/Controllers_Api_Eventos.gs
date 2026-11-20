/**
 * Controllers_Api_Eventos.gs
 * Placeholder para Etapa 2 — acá se van a exponer los conectores (Planning,
 * WhatsApp, mail, NPS) cuando se implementen. El contrato de entrada ya está
 * definido en Engine_EventEngine.recibirEvento(), así que conectar una fuente
 * nueva es, en principio, armar el payload correcto y llamarla — sin tocar
 * el motor ni las reglas.
 *
 * Ejemplo de cómo se vería el conector de Planning cuando se conecte
 * (referencia, no activo todavía):
 *
 * function apiRecibirEventoPlanning(params){
 *   return recibirEvento({
 *     fuente: 'Planning',
 *     vin: params.dominio || params.chasis,
 *     cliente: params.cliente,
 *     telefono: params.telefono, email: params.email,
 *     marca: params.marca, modelo: params.modelo, sucursal: params.sucursal,
 *     motivo: params.motivo, descripcion: params.descripcion,
 *     origenId: params.codigo // el PA-2026-XXXX que genera Planning
 *   });
 * }
 */
