function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanRut(rut) {
  return String(rut || "").replace(/\./g, "").replace(/-/g, "").trim().toUpperCase();
}

function formatRut(rut) {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return cleaned;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

function isValidRut(rut) {
  const cleaned = cleanRut(rut);
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  let sum = 0;
  let factor = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const result = 11 - (sum % 11);
  const expected = result === 11 ? "0" : result === 10 ? "K" : String(result);
  return dv === expected;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isValidPhone(phone) {
  return /^[+0-9\s-]{8,18}$/.test(String(phone || "").trim());
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validatePayload(payload) {
  const required = [
    ["rut_empresa", "RUT empresa"],
    ["razon_social", "Razón social"],
    ["giro", "Giro"],
    ["telefono", "Teléfono"],
    ["direccion", "Dirección"],
    ["comuna", "Comuna"],
    ["mail", "Mail"],
    ["nombre_contacto", "Nombre contacto"]
  ];

  for (const [key, label] of required) {
    if (!cleanText(payload[key])) return `Falta completar: ${label}.`;
  }

  if (!isValidRut(payload.rut_empresa)) return "RUT empresa inválido.";
  if (!isValidEmail(payload.mail)) return "Mail inválido.";
  if (!isValidPhone(payload.telefono)) return "Teléfono inválido.";

  return null;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function saveToSupabase(payload) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/clientes_solicitudes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (_) {}

  if (!response.ok) {
    throw new Error(result?.message || "No se pudo guardar la solicitud en Supabase.");
  }

  return Array.isArray(result) ? result[0] : result;
}

async function sendEmail(payload, savedRecord) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const to = process.env.CLIENTES_DESTINO_EMAIL;
  const from = process.env.CLIENTES_REMITENTE_EMAIL;

  if (!resendApiKey || !to || !from) {
    throw new Error("El registro se guardó, pero faltan variables de correo en Vercel: RESEND_API_KEY, CLIENTES_DESTINO_EMAIL o CLIENTES_REMITENTE_EMAIL.");
  }

  const createdAt = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });

  const rows = [
    ["RUT empresa", payload.rut_empresa],
    ["Razón social", payload.razon_social],
    ["Giro", payload.giro],
    ["Teléfono", payload.telefono],
    ["Dirección", payload.direccion],
    ["Comuna", payload.comuna],
    ["Mail", payload.mail],
    ["Nombre contacto", payload.nombre_contacto],
    ["Estado", payload.estado],
    ["Origen", payload.origen],
    ["Fecha ingreso", createdAt],
    ["ID registro", savedRecord?.id || "Sin ID"]
  ];

  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px;border:1px solid #d0d5dd;background:#f8fafc;"><strong>${escapeHtml(label)}</strong></td>
      <td style="padding:10px;border:1px solid #d0d5dd;">${escapeHtml(value)}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#101828;line-height:1.45;">
      <h2 style="margin:0 0 14px;">Nueva solicitud de creación de cliente</h2>
      <table style="border-collapse:collapse;width:100%;max-width:760px;font-size:14px;">${htmlRows}</table>
      <p style="margin-top:16px;color:#667085;">Registro generado desde PWA QR VALEPAC.</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Nueva solicitud cliente - ${payload.razon_social}`,
      html
    })
  });

  const text = await response.text();
  let result = null;
  try { result = text ? JSON.parse(text) : null; } catch (_) {}

  if (!response.ok) {
    throw new Error(result?.message || "El registro se guardó, pero Resend no pudo enviar el correo.");
  }

  return result;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return json(res, 200, { ok: true });

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, message: "Método no permitido." });
  }

  try {
    const data = await readBody(req);

    const payload = {
      rut_empresa: formatRut(data.rut_empresa),
      razon_social: cleanText(data.razon_social),
      giro: cleanText(data.giro),
      telefono: cleanText(data.telefono),
      direccion: cleanText(data.direccion),
      comuna: cleanText(data.comuna),
      mail: cleanText(data.mail).toLowerCase(),
      nombre_contacto: cleanText(data.nombre_contacto),
      estado: "Pendiente",
      origen: "PWA QR"
    };

    const validationError = validatePayload(payload);
    if (validationError) return json(res, 400, { ok: false, message: validationError });

    const savedRecord = await saveToSupabase(payload);
    await sendEmail(payload, savedRecord);

    return json(res, 200, {
      ok: true,
      message: "Solicitud enviada correctamente.",
      id: savedRecord?.id || null
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      message: error.message || "Error interno."
    });
  }
};
