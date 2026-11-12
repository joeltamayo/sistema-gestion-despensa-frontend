import { api } from "../api.js";
import { html, pintar, conCarga } from "../utils.js";

// Monta la vista de login en `contenedor`. Maneja el envío del formulario y muestra errores de red o de datos.
export async function montar(contenedor) {
  // Pinta la vista de login con el formulario y el botón de mostrar/ocultar contraseña. Maneja el envío del formulario y muestra errores.
  pintar(contenedor, html`<div class="acceso">
    <div class="marca"><span class="marca-icono"><i class="bi bi-basket3-fill"></i></span><span class="marca-nombre">Despensa</span></div>
    <h1>Entra a tu despensa</h1>
    <p class="text-secondary">Revisa qué tienes, qué se acaba y qué está por caducar.</p>
    <form class="panel panel-cuerpo d-grid gap-3 mt-4" novalidate>
      <div class="alert alert-danger py-2 mb-0" role="alert" data-error hidden></div>
      <div>
        <label class="form-label" for="correo">Correo electrónico</label>
        <input class="form-control" type="email" id="correo" name="correo" autocomplete="username" required autofocus>
      </div>
      <div>
        <label class="form-label" for="password">Contraseña</label>
        <div class="input-group">
          <input class="form-control" type="password" id="password" name="password" autocomplete="current-password" required>
          <button class="btn btn-outline-secondary" type="button" data-ver aria-label="Mostrar contraseña" aria-pressed="false"><i class="bi bi-eye"></i></button>
        </div>
      </div>
      <button class="btn btn-primary btn-lg" type="submit">Entrar</button>
    </form>
  </div>`);

  const form = contenedor.querySelector("form");
  const error = contenedor.querySelector("[data-error]");
  const verBtn = contenedor.querySelector("[data-ver]");
  verBtn.addEventListener("click", () => {
    const campo = form.elements.password;
    const mostrar = campo.type === "password";
    campo.type = mostrar ? "text" : "password";
    verBtn.setAttribute("aria-pressed", String(mostrar));
    verBtn.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
    verBtn.innerHTML = `<i class="bi bi-eye${mostrar ? "-slash" : ""}"></i>`;
  });

  // Maneja el envío del formulario y muestra errores de red o de datos. Si el login es correcto, dispara un evento `sesion-iniciada` con los datos del usuario.
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    error.hidden = true;
    const correo = form.elements.correo.value.trim();
    const password = form.elements.password.value;
    if (!correo || !password) {
      error.textContent = "Escribe tu correo y tu contraseña.";
      error.hidden = false;
      return;
    }
    try {
      const r = await conCarga(form.querySelector('[type="submit"]'), () => api.post("/auth/login", { correo, password }));
      window.dispatchEvent(new CustomEvent("sesion-iniciada", { detail: r.usuario }));
    } catch (e) {
      error.textContent = e.detalles && e.detalles.length ? e.detalles.map((d) => d.mensaje).join(" ") : e.message;
      error.hidden = false;
      form.elements.password.value = "";
      form.elements.password.focus();
    }
  });
}
