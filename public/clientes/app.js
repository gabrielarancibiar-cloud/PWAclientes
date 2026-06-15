const form = document.getElementById("clienteForm");
const submitBtn = document.getElementById("submitBtn");
const messageBox = document.getElementById("message");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function cleanRut(rut) {
  return rut.replace(/\./g, "").replace(/-/g, "").trim().toUpperCase();
}

function formatRut(rut) {
  const cleaned = cleanRut(rut);

  if (cleaned.length < 2) return rut;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
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

function setError(input, text) {
  input.classList.add("invalid");
  const error = input.parentElement.querySelector(".error");
  if (error) error.textContent = text;
}

function clearError(input) {
  input.classList.remove("invalid");
  const error = input.parentElement.querySelector(".error");
  if (error) error.textContent = "";
}

function showMessage(type, text) {
  messageBox.className = `message ${type}`;
  messageBox.textContent = text;
}

function validateForm(data) {
  let valid = true;

  [...form.querySelectorAll("input[required]")].forEach((input) => {
    clearError(input);

    if (!data[input.name] || !data[input.name].trim()) {
      setError(input, "Campo obligatorio.");
      valid = false;
    }
  });

  const rutInput = form.querySelector("[name='rut_empresa']");
  const mailInput = form.querySelector("[name='mail']");
  const phoneInput = form.querySelector("[name='telefono']");

  if (data.rut_empresa && !isValidRut(data.rut_empresa)) {
    setError(rutInput, "RUT inválido.");
    valid = false;
  }

  if (data.mail && !isValidEmail(data.mail)) {
    setError(mailInput, "Correo inválido.");
    valid = false;
  }

  if (data.telefono && !isValidPhone(data.telefono)) {
    setError(phoneInput, "Teléfono inválido.");
    valid = false;
  }

  return valid;
}

form.rut_empresa.addEventListener("blur", () => {
  form.rut_empresa.value = formatRut(form.rut_empresa.value);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  if (data.website) {
    return;
  }

  const payload = {
    rut_empresa: formatRut(data.rut_empresa || ""),
    razon_social: data.razon_social?.trim(),
    giro: data.giro?.trim(),
    telefono: data.telefono?.trim(),
    direccion: data.direccion?.trim(),
    comuna: data.comuna?.trim(),
    mail: data.mail?.trim().toLowerCase(),
    nombre_contacto: data.nombre_contacto?.trim()
  };

  if (!validateForm(payload)) {
    showMessage("error", "Revise los campos marcados antes de enviar.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    const response = await fetch("/api/crear-cliente", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No se pudo enviar la solicitud.");
    }

    form.reset();

    showMessage(
      "success",
      "Solicitud enviada correctamente. Nos contactaremos a la brevedad."
    );
  } catch (error) {
    showMessage(
      "error",
      error.message || "Ocurrió un error. Intente nuevamente."
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar solicitud";
  }
});
