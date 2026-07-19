// sheets.js
// Maneja la lectura/escritura en Google Sheets (hoja "Gastos" y hoja "Presupuestos")

const { google } = require("googleapis");

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const HOJA_GASTOS = "Gastos";
const HOJA_PRESUPUESTOS = "Presupuestos";

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

// Agrega una fila nueva a la hoja "Gastos"
// Columnas: Fecha | Hora | Tipo | Metodo | Banco | Monto | Descripcion | Fuente
async function agregarFila(datos) {
  const sheets = await getSheetsClient();
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString("es-PE", { timeZone: "America/Lima" });
  const hora = ahora.toLocaleTimeString("es-PE", { timeZone: "America/Lima" });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${HOJA_GASTOS}!A:H`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        fecha,
        hora,
        datos.tipo,
        datos.metodo,
        datos.banco,
        datos.monto,
        datos.descripcion,
        datos.fuente,
      ]],
    },
  });
}

// Suma el gasto de HOY (solo tipo "pago" y "gasto") sumando todos los bancos + efectivo
async function obtenerGastoDelDia() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${HOJA_GASTOS}!A:H`,
  });

  const filas = res.data.values || [];
  const hoy = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });

  let total = 0;
  for (const fila of filas.slice(1)) { // saltar encabezado
    const [fecha, , tipo, , , monto] = fila;
    if (fecha === hoy && (tipo === "pago" || tipo === "gasto")) {
      total += Number(monto) || 0;
    }
  }
  return total;
}

// Lee la hoja "Presupuestos" con columnas: Banco | Presupuesto Mensual
// y calcula lo gastado en el mes actual para cada banco
async function obtenerPresupuestos() {
  const sheets = await getSheetsClient();

  const [presupuestosRes, gastosRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOJA_PRESUPUESTOS}!A:B`,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOJA_GASTOS}!A:H`,
    }),
  ]);

  const filasPresupuesto = (presupuestosRes.data.values || []).slice(1);
  const filasGastos = (gastosRes.data.values || []).slice(1);

  const mesActual = new Date().getMonth();
  const anioActual = new Date().getFullYear();

  const resultado = {};
  for (const [banco, presupuesto] of filasPresupuesto) {
    resultado[banco] = { presupuesto: Number(presupuesto) || 0, gastado: 0 };
  }

  for (const fila of filasGastos) {
    const [fechaStr, , tipo, , banco, monto] = fila;
    if (!resultado[banco]) continue;
    if (tipo !== "pago" && tipo !== "gasto") continue;

    // fechaStr viene en formato dd/mm/yyyy (es-PE)
    const [dia, mes, anio] = fechaStr.split("/").map(Number);
    if (mes - 1 === mesActual && anio === anioActual) {
      resultado[banco].gastado += Number(monto) || 0;
    }
  }

  return resultado;
}

module.exports = { agregarFila, obtenerGastoDelDia, obtenerPresupuestos };
