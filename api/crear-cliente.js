function cleanText(value) {
  return String(value || "").trim();
}

function cleanRut(rut) {
  return String(rut || "")
    .replace(/\./g, "")
    .replace(/-/g, "")
    .trim()
    .toUpperCase();
}

function isValidRut(rut) {
  const cleaned = cleanRut(rut);

  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expected = 11 - (sum % 11);
  const expectedDv = expected === 11 ? "0" : expected === 10 ? "K" : String(expected);

  return dv === expectedDv;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[+0-9\s-]{8,18}$/.test(phone);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validatePayload(data) {
  const requiredFields = [
    "rut_empresa",
    "razon_social",
    "giro",
    "telefono",
    "direccion",
    "comuna",
    "mail",
    "nombre_contacto"
  ];

  for (const field of requiredFields) {
    if (!cleanText(data[field])) {
      return `Falta el campo: ${field}`;
    }
  }

  if (!isValidRut(data.rut_empresa)) {
    return "RUT inválido.";
  }

  if (!isValidEmail(data.mail)) {
    return "Correo inválido.";
  }

  if (!isValidPhone(data.telefono)) {
    return "Teléfono inválido.";
  }

  return null;
}

async function saveToSupabase(payload) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de Supabase.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/clientes_solicitudes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = result?.message || result?.details || "No se pudo guardar en Supabase.";
    throw new Error(detail);
  }

  return result?.[0] || null;
}

async function sendEmail(payload, savedRecord) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const to = process.env.CLIENTES_DESTINO_EMAIL;
  const from = process.env.CLIENTES_REMITENTE_EMAIL || "onboarding@resend.dev";

  if (!resendApiKey || !to) {
    throw new Error("Faltan variables para envío de correo.");
  }

  const createdAt = new Date().toLocaleString("es-CL", {
    timeZone: "America/Santiago"
  });

  const rows = [
    ["RUT empresa", payload.rut_empresa],
    ["Razón social", payload.razon_social],
    ["Giro", payload.giro],
    ["Teléfono", payload.telefono],
    ["Dirección", payload.direccion],
    ["Comuna", payload.comuna],
    ["Mail", payload.mail],
    ["Nombre contacto", payload.nombre_contacto],
    ["Fecha ingreso", createdAt],
    ["ID registro", savedRecord?.id || "Sin ID"]
  ];

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="border:1px solid #D9E2EC;padding:8px;"><strong>${escapeHtml(label)}</strong></td>
      <td style="border:1px solid #D9E2EC;padding:8px;">${escapeHtml(value)}</td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #172033;">
      <h2>Nueva solicitud de creación de cliente</h2>
      <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 720px;">
        ${tableRows}
      </table>
      <p style="margin-top: 20px;">Registro generado desde PWA QR VALEPAC.</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Nueva solicitud cliente - ${payload.razon_social}`,
      html
    })
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = result?.message || "El registro se guardó, pero no se pudo enviar el correo.";
    throw new Error(detail);
  }

  return result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Método no permitido."
    });
  }

  try {
    const data = req.body || {};

    const payload = {
      rut_empresa: cleanText(data.rut_empresa),
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

    if (validationError) {
      return res.status(400).json({
        ok: false,
        message: validationError
      });
    }

    const savedRecord = await saveToSupabase(payload);

    await sendEmail(payload, savedRecord);

    return res.status(200).json({
      ok: true,
      message: "Solicitud enviada correctamente.",
      id: savedRecord?.id || null
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Error interno."
    });
  }
}
