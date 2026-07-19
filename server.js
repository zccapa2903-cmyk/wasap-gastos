// server.js
// Bot de WhatsApp para registrar gastos automáticamente en Google Sheets
// Stack: Node.js + Express + Twilio (WhatsApp Sandbox) + Claude API + Google Sheets API

const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const { classificarTexto, classificarImagen } = require("./classify");
const { agregarFila, obtenerGastoDelDia, obtenerPresupuestos } = require("./sheets");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const LIMITE_DIARIO = Number(process.env.LIMITE_DIARIO || 50);

// Memoria temporal para completar datos de una foto (ej: falta el banco)
// En producción real esto podría ir a una base de datos, pero para uso personal
// con un solo número, un Map en memoria es suficiente.
const pendientes = new Map();

const BANCOS_VALIDOS = ["BCP", "BBVA", "BN"];

app.post("/whatsapp", async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From; // ej: whatsapp:+51999999999
  const numMedia = parseInt(req.body.NumMedia || "0", 10);
  const texto = (req.body.Body || "").trim();

  try {
    // Caso 1: el usuario está completando un dato pendiente (ej: el banco de una foto)
    if (pendientes.has(from) && !numMedia) {
      const bancoTexto = texto.toUpperCase();
      if (BANCOS_VALIDOS.includes(bancoTexto)) {
        const datos = pendientes.get(from);
        datos.banco = bancoTexto === "BN" ? "Banco de la Nacion" : bancoTexto;
        pendientes.delete(from);
        await procesarYResponder(datos, twiml);
        res.type("text/xml").send(twiml.toString());
        return;
      }
      // si no reconoce el banco, sigue esperando, y además intenta procesar
      // el mensaje como un gasto nuevo por si acaso escribió otra cosa
    }

    // Caso 2: llega una foto (boleta / recibo / captura de Yape)
    // Por ahora, sin la IA activada, no podemos leer fotos automáticamente.
    if (numMedia > 0) {
      twiml.message(
        "Por ahora no puedo leer fotos de boletas (esa función necesita IA con saldo activo).\n" +
        "Escríbeme el gasto en texto, por ejemplo:\n" +
        '"pagué 25 en yape del almuerzo"'
      );
      res.type("text/xml").send(twiml.toString());
      return;
    }

    // Caso 3: mensaje de texto normal
    if (texto) {
      const datos = await classificarTexto(texto);

      if (!datos.monto) {
        twiml.message(
          "No pude identificar el monto. Ejemplo de formato:\n" +
          '"pagué 25 soles en Yape del almuerzo" o "retiré 100 del BBVA"'
        );
        res.type("text/xml").send(twiml.toString());
        return;
      }

      if (!datos.banco) {
        pendientes.set(from, datos);
        twiml.message(
          `Detecté: ${datos.tipo} de S/ ${datos.monto} (${datos.metodo}).\n` +
          `¿De qué banco es? Responde: BCP, BBVA o BN`
        );
        res.type("text/xml").send(twiml.toString());
        return;
      }

      await procesarYResponder(datos, twiml);
      res.type("text/xml").send(twiml.toString());
      return;
    }

    twiml.message("Envíame un texto describiendo el gasto, o una foto de la boleta/recibo.");
    res.type("text/xml").send(twiml.toString());
  } catch (err) {
    console.error("Error procesando mensaje:", err);
    twiml.message("Ocurrió un error procesando tu gasto. Intenta de nuevo.");
    res.type("text/xml").send(twiml.toString());
  }
});

// Guarda el movimiento en Sheets y arma la respuesta (incluye alerta de límite diario)
async function procesarYResponder(datos, twiml) {
  await agregarFila(datos);

  let mensaje = `✅ Registrado: ${datos.tipo} de S/ ${datos.monto} (${datos.metodo} - ${datos.banco})`;

  // El límite diario solo aplica a gasto real (pago/gasto), no a retiro ni préstamo
  if (datos.tipo === "pago" || datos.tipo === "gasto") {
    const gastoHoy = await obtenerGastoDelDia();
    mensaje += `\n📊 Gasto de hoy: S/ ${gastoHoy.toFixed(2)} / S/ ${LIMITE_DIARIO}`;
    if (gastoHoy > LIMITE_DIARIO) {
      mensaje += `\n⚠️ Te excediste del límite diario de S/ ${LIMITE_DIARIO}`;
    }
  }

  // Aviso si el banco superó su presupuesto mensual
  const presupuestos = await obtenerPresupuestos();
  const p = presupuestos[datos.banco];
  if (p && p.gastado > p.presupuesto) {
    mensaje += `\n⚠️ Superaste el presupuesto mensual de ${datos.banco} (S/ ${p.gastado.toFixed(2)} / S/ ${p.presupuesto})`;
  }

  twiml.message(mensaje);
}

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
