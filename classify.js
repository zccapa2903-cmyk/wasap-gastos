// classify.js
// Clasifica el gasto a partir de texto usando REGLAS de palabras clave (sin IA, sin costo).
// Para reactivar la clasificación con IA en el futuro, revisa la versión anterior de este
// archivo (o pide ayuda para volver a integrarla) y agrega saldo en console.anthropic.com

const PALABRAS_RETIRO = ["retiré", "retire", "retiro", "saqué", "saque"];
const PALABRAS_PRESTAMO = ["presté", "preste", "prestamo", "préstamo"];
const PALABRAS_PAGO = ["pagué", "pague", "pago de", "cancelé", "cancele", "cancelar"];

const BANCOS = {
  "bcp": "BCP",
  "bbva": "BBVA",
  "banco de la nacion": "Banco de la Nacion",
  "banco de la nación": "Banco de la Nacion",
  "bn": "Banco de la Nacion",
  "nacion": "Banco de la Nacion",
};

function detectarTipo(textoLower) {
  if (PALABRAS_RETIRO.some((p) => textoLower.includes(p))) return "retiro";
  if (PALABRAS_PRESTAMO.some((p) => textoLower.includes(p))) return "prestamo";
  if (PALABRAS_PAGO.some((p) => textoLower.includes(p))) return "pago";
  return "gasto";
}

function detectarMetodo(textoLower) {
  if (textoLower.includes("yape")) return "yape";
  if (textoLower.includes("efectivo") || textoLower.includes("cash")) return "efectivo";
  if (textoLower.includes("consumo") || textoLower.includes("tarjeta") || textoLower.includes("app")) return "consumo";
  return null;
}

function detectarBanco(textoLower) {
  if (textoLower.includes("yape")) return "BCP"; // Yape es de BCP
  for (const clave in BANCOS) {
    if (textoLower.includes(clave)) return BANCOS[clave];
  }
  return null;
}

function detectarMonto(texto) {
  // Busca el primer número (con decimales opcionales) en el mensaje
  const match = texto.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  return Number(match[1].replace(",", "."));
}

function detectarDescripcion(texto, textoLower) {
  // Quita palabras clave y números para quedarnos con lo relevante como descripción
  let limpio = texto
    .replace(/(\d+(?:[.,]\d+)?)/g, "")
    .replace(/\b(soles?|sol|yape|bcp|bbva|banco de la naci[oó]n|bn|pagu[eé]|retir[eé]|prest[eé]|efectivo|consumo|tarjeta|del|de|en|con|la|el|a|mi)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return limpio || "sin descripcion";
}

// Clasifica un mensaje de texto usando reglas de palabras clave
async function classificarTexto(mensaje) {
  const textoLower = mensaje.toLowerCase();

  const tipo = detectarTipo(textoLower);
  const metodo = detectarMetodo(textoLower) || (tipo === "retiro" ? "efectivo" : "efectivo");
  const banco = detectarBanco(textoLower);
  const monto = detectarMonto(mensaje);
  const descripcion = detectarDescripcion(mensaje, textoLower);

  return {
    tipo,
    metodo,
    banco,
    monto,
    descripcion,
    fuente: "texto",
  };
}

// Las fotos requieren IA (OCR con visión) para leer el monto automáticamente.
// Sin saldo en la API, no podemos procesarlas: devolvemos null para que el bot
// le pida al usuario que lo escriba en texto en su lugar.
async function classificarImagen(mediaUrl, mediaType) {
  return null;
}

module.exports = { classificarTexto, classificarImagen };
