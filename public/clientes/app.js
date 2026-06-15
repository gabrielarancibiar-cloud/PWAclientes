const form = document.getElementById("clienteForm");
const submitBtn = document.getElementById("submitBtn");
const messageBox = document.getElementById("message");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/clientes/sw.js").catch(() => {});
  });
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

function setError(input, message) {
  input.classList.add("invalid");
  const error = input.parentElement.querySelector(".error");
  if (error) error.textContent = message;
}

function clearError(input) {
  input.classList.remove("invalid");
  const error = input.parentElement.querySelector(".error");
  if (error) error.textContent = "";
}

function showMessage(type, message) {
  messageBox.className = `message ${type}`;
  messageBox.textContent = message;
}

function payloadFromForm() {
  const data = Object.fromEntries(new FormData(form).entries());

  return {
    empresa_web: String(data.empresa_web || "").trim(),
    rut_empresa: formatRut(data.rut_empresa),
    razon_social: String(data.razon_social || "").trim(),
    giro: String(data.giro || "").trim(),
    telefono: String(data.telefono || "").trim(),
    direccion: String(data.direccion || "").trim(),
    comuna: String(data.comuna || "").trim(),
    mail: String(data.mail || "").trim().toLowerCase(),
    nombre_contacto: String(data.nombre_contacto || "").trim()
  };
}

function validate(payload) {
  let ok = true;
  const required = [
    "rut_empresa",
    "razon_social",
    "giro",
    "telefono",
    "direccion",
    "comuna",
    "mail",
    "nombre_contacto"
  ];

  for (const input of form.querySelectorAll("input[required]")) clearError(input);

  for (const name of required) {
    const input = form.elements[name];
    if (!payload[name]) {
      setError(input, "Campo obligatorio.");
      ok = false;
    }
  }

  if (payload.rut_empresa && !isValidRut(payload.rut_empresa)) {
    setError(form.elements.rut_empresa, "RUT inválido.");
    ok = false;
  }

  if (payload.mail && !isValidEmail(payload.mail)) {
    setError(form.elements.mail, "Correo inválido.");
    ok = false;
  }

  if (payload.telefono && !isValidPhone(payload.telefono)) {
    setError(form.elements.telefono, "Teléfono inválido.");
    ok = false;
  }

  return ok;
}

form.elements.rut_empresa.addEventListener("blur", () => {
  form.elements.rut_empresa.value = formatRut(form.elements.rut_empresa.value);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = payloadFromForm();

  if (payload.empresa_web) return;

  if (!validate(payload)) {
    showMessage("error", "Revise los campos marcados antes de enviar.");
    return;
  }

  delete payload.empresa_web;
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    const response = await fetch("/api/crear-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "No se pudo enviar la solicitud.");
    }

    form.reset();
    showMessage("success", "Solicitud enviada correctamente. Nos contactaremos a la brevedad.");
  } catch (error) {
    showMessage("error", error.message || "Ocurrió un error. Intente nuevamente.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar solicitud";
  }
});
