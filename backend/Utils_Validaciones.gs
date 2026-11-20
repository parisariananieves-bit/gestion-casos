/**
 * Utils_Validaciones.gs
 */
function utilNormalizarTexto_(s){
  return String(s||'').trim().toUpperCase();
}
function utilEsDni_(s){
  return /^\d{6,10}$/.test(String(s||'').trim());
}
function utilHashSimple_(texto){
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(texto));
  return raw.map(function(b){ var v=(b<0?b+256:b).toString(16); return v.length===1?'0'+v:v; }).join('');
}
