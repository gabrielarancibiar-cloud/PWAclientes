const form = document.getElementById("clienteForm");
const submitBtn = document.getElementById("submitBtn");
const messageBox = document.getElementById("message");
const fileInput = document.getElementById("respaldo_foto");
const fileStatus = document.getElementById("fileStatus");

const MAX_ORIGINAL_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_COMPRESSED_IMAGE_BYTES = 3 * 1024 * 1024;

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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la fotografía."));
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      resolve(dataUrl.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("No se pudo procesar la fotografía."));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file) {
  if (!file) return null;

  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo adjunto debe ser una imagen.");
  }

  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new Error("La fotografía es demasiado pesada. Use una imagen de máximo 12 MB.");
  }

  const dataUrl = await readFileAsDataUrl(file);

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("La imagen no se pudo cargar."));
    img.src = dataUrl;
  });

  const maxSide = 1600;
  let { width, height } = image;

  if (width > maxSide || height > maxSide) {
    if (width > height) {
      height = Math.round((height * maxSide) / width);
      width = maxSide;
    } else {
      width = Math.round((width * maxSide) / height);
      height = maxSide;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.72);
  });

  if (!blob) throw new Error("No se pudo comprimir la fotografía.");

  if (blob.size > MAX_COMPRESSED_IMAGE_BYTES) {
    throw new Error("La fotografía comprimida sigue siendo pesada. Tome una foto más simple o recorte la imagen.");
  }

  const base64 = await blobToBase64(blob);
  const safeName = (file.name || "respaldo-dte.jpg").replace(/\.[^/.]+$/, "") + ".jpg";

  return {
    file_name: safeName,
    mime_type: "image/jpeg",
    size: blob.size,
    base64
  };
}

async function payloadFromForm() {
  const data = Object.fromEntries(new FormData(form).entries());
  const selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

  const payload = {
    empresa_web: String(data.empresa_web || "").trim(),
    rut_empresa: formatRut(data.rut_empresa),
    razon_social: String(data.razon_social || "").trim(),
    giro: String(data.giro || "").trim(),
    telefono: String(data.telefono || "").trim(),
    direccion: String(data.direccion || "").trim(),
    comuna: String(data.comuna || "").trim(),
    mail: String(data.mail || "").trim().toLowerCase(),
    nombre_contacto: String(data.nombre_contacto || "").trim(),
    tipo_solicitud: String(data.tipo_solicitud || "Creación de cliente").trim(),
    folio_dte: String(data.folio_dte || "").trim(),
    observacion: String(data.observacion || "").trim()
  };

  if (selectedFile) {
    fileStatus.textContent = "Procesando fotografía...";
    payload.respaldo_foto = await compressImage(selectedFile);
    fileStatus.textContent = `Fotografía lista: ${(payload.respaldo_foto.size / 1024).toFixed(0)} KB`;
  }

  return payload;
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
  clearError(fileInput);

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

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
  clearError(fileInput);

  if (!file) {
    fileStatus.textContent = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    setError(fileInput, "Debe adjuntar una imagen.");
    fileStatus.textContent = "";
    return;
  }

  fileStatus.textContent = `Seleccionada: ${file.name}`;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitBtn.disabled = true;
  submitBtn.textContent = "Preparando...";

  try {
    const payload = await payloadFromForm();

    if (payload.empresa_web) return;

    if (!validate(payload)) {
      showMessage("error", "Revise los campos marcados antes de enviar.");
      return;
    }

    delete payload.empresa_web;
    submitBtn.textContent = "Enviando...";

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
    fileStatus.textContent = "";
    showMessage("success", "Solicitud enviada correctamente. Nos contactaremos a la brevedad.");
  } catch (error) {
    showMessage("error", error.message || "Ocurrió un error. Intente nuevamente.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar solicitud";
  }
});
