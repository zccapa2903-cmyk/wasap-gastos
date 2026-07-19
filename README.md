# Bot de Gastos por WhatsApp

Registra tus gastos escribiendo por WhatsApp (texto o foto de boleta) y todo se guarda
automáticamente en Google Sheets, clasificado por tipo, método, banco, con alerta si
te excedes de S/50 al día o del presupuesto mensual de cada banco.

---

## 1. Cómo funciona

Le escribes a un número de WhatsApp así:

```
pagué 25 en yape del almuerzo
```
```
retiré 100 del bbva
```
```
le presté 50 a mi hermano
```
O le mandas una **foto de la boleta/recibo** y la IA la lee sola.

El bot responde con la confirmación y el total gastado en el día. Si no menciona
el banco (y no es Yape), te pregunta "¿De qué banco es? BCP, BBVA o BN".

---

## 2. Preparar el Google Sheet

1. Crea un Google Sheet nuevo.
2. Crea 2 hojas (pestañas) dentro, con estos nombres exactos:

**Hoja "Gastos"** — encabezados en la fila 1:
```
Fecha | Hora | Tipo | Metodo | Banco | Monto | Descripcion | Fuente
```

**Hoja "Presupuestos"** — encabezados en la fila 1, y tus 3 bancos debajo:
```
Banco              | Presupuesto Mensual
BCP                | 800
BBVA               | 500
Banco de la Nacion | 300
```
(Cambia los montos por los que tú quieras — son solo ejemplo)

3. Copia el ID del Sheet desde la URL:
   `https://docs.google.com/spreadsheets/d/AQUI_ESTA_EL_ID/edit`

---

## 3. Crear la cuenta de servicio de Google (para que el bot pueda escribir en tu Sheet)

1. Ve a https://console.cloud.google.com/ y crea un proyecto nuevo.
2. Activa la **Google Sheets API** (Menú → APIs y servicios → Habilitar APIs → busca "Google Sheets API").
3. Ve a "Credenciales" → "Crear credenciales" → "Cuenta de servicio".
4. Dale un nombre, créala, y luego entra a la cuenta de servicio creada → pestaña "Claves" → "Agregar clave" → JSON. Se descarga un archivo `.json`.
5. Abre ese archivo y copia **todo su contenido** — eso va en la variable `GOOGLE_CREDENTIALS_JSON`.
6. **Importante:** dentro del archivo JSON hay un campo `client_email` (algo como `bot@proyecto.iam.gserviceaccount.com`). Copia ese correo y **compártele tu Google Sheet** (botón "Compartir" en el Sheet, como si fuera una persona más, con permiso de Editor).

---

## 4. Crear cuenta de Twilio (gratis) y activar el Sandbox de WhatsApp

1. Crea una cuenta en https://www.twilio.com/try-twilio (gratis).
2. En el dashboard, ve a **Messaging → Try it out → Send a WhatsApp message**.
3. Te va a mostrar un número de Twilio y un código, algo como:
   *"Envía `join nombre-palabra` al +1 415 523 8886"*
4. Desde tu WhatsApp normal, guarda ese número y envíale ese mensaje de activación.
   Esto conecta tu WhatsApp al sandbox (dura activo mientras sigas usándolo, si pasan
   72h sin uso hay que reactivarlo enviando el mismo código de nuevo).
5. Copia tu **Account SID** y **Auth Token** desde el dashboard principal de Twilio.

---

## 5. Conseguir tu API Key de Anthropic

1. Ve a https://console.anthropic.com/settings/keys
2. Crea una API key nueva y cópiala.

---

## 6. Desplegar el bot (gratis, con Render)

1. Sube esta carpeta a un repositorio de GitHub.
2. Ve a https://render.com → "New" → "Web Service" → conecta tu repo.
3. Configúralo así:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. En la sección "Environment", agrega todas las variables del archivo `.env.example`
   con tus datos reales (API keys, IDs, credenciales JSON, etc.)
5. Deploy. Cuando termine, Render te da una URL pública, ej:
   `https://tu-bot.onrender.com`

---

## 7. Conectar Twilio con tu bot desplegado

1. Vuelve a Twilio → **Messaging → Try it out → Send a WhatsApp message** → "Sandbox settings".
2. En el campo **"When a message comes in"**, pega:
   `https://tu-bot.onrender.com/whatsapp`
3. Método: `HTTP POST`. Guarda.

¡Listo! Ya puedes escribirle a tu WhatsApp del sandbox y todo se registrará solo.

---

## 8. Ver / exportar tus gastos en Excel

El Google Sheet se actualiza en tiempo real. Cuando quieras revisarlo en Excel:
- Archivo → Descargar → Microsoft Excel (.xlsx)

O si prefieres, puedes vincular el Sheet directamente a Excel Online usando
"Datos → Obtener datos → Desde otras fuentes → Desde la Web" con el link para exportar en CSV.

---

## 9. Notas sobre la lógica de clasificación (ajustable)

- El **límite diario de S/50** solo suma movimientos tipo `pago` y `gasto`
  (no suma `retiro` ni `prestamo`, porque no son gasto real).
- Si escribes "yape", el banco se asigna automáticamente a **BCP**.
- Si el mensaje no menciona el banco y no es yape, el bot te pregunta antes de guardar.
- Si en algún momento quieres cambiar estas reglas (por ejemplo, que el retiro sí cuente
  para el límite diario), se ajusta en el archivo `classify.js` y `server.js`.

## 10. Costos aproximados

- Twilio Sandbox: gratis para uso personal.
- Render (plan free): gratis, aunque el servidor "duerme" tras inactividad y demora
  unos segundos en despertar con el primer mensaje del día.
- Anthropic API: se paga por uso, pero para clasificar mensajes cortos el costo es
  de centavos de dólar al mes con tu volumen de uso personal.
- Google Sheets API: gratis.
