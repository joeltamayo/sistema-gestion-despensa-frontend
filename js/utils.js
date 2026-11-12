// Utilidades: escape de HTML, formato de números y fechas, avisos y confirmaciones.

// ---- Plantillas HTML seguras -------------------------------------------------
// html`...` escapa automáticamente todo lo que se inserta con ${...}, de modo que
// un nombre de producto como <img onerror=...> se muestra como texto, no se ejecuta.
export class Seguro {
  constructor(texto) { this.texto = texto; }
  toString() { return this.texto; }
}
export const raw = (texto) => new Seguro(texto);

export function esc(valor) {
  return String(valor).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function valorSeguro(v) {
  if (v instanceof Seguro) return v.texto;
  if (Array.isArray(v)) return v.map(valorSeguro).join("");
  if (v === null || v === undefined || v === false) return "";
  return esc(v);
}
export function html(cadenas, ...valores) {
  let salida = cadenas[0];
  valores.forEach((v, i) => { salida += valorSeguro(v) + cadenas[i + 1]; });
  return new Seguro(salida);
}

//  Pone el resultado de html`...` dentro de un elemento.
export function pintar(elemento, contenido) {
  elemento.innerHTML = contenido instanceof Seguro ? contenido.texto : esc(contenido);
}

// ---- Formatos ------------------------------------------------------------------
const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 });
export const numero = (n) => nf.format(n);

// 0.75 pza -> "¾"; el resto de cantidades como número normal.
export function cantidadTexto(n, unidad) {
  if (unidad === "pza") {
    const entero = Math.trunc(n);
    const fraccion = Math.round((n - entero) * 100) / 100;
    const f = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[fraccion];
    if (f) return entero ? `${entero} ${f}` : f;
  }
  return numero(n);
}

const fechaHora = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });
const fechaLarga = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

// "2026-11-03T06:15:00Z" -> hora local legible.
export const fechaHoraLocal = (iso) => (iso ? fechaHora.format(new Date(iso)) : "");

// "2026-11-03" (solo fecha, sin zona horaria) -> "3 nov 2026".
export function fechaCorta(aaaammdd) {
  if (!aaaammdd) return "";
  const [y, m, d] = aaaammdd.split("-").map(Number);
  return fechaLarga.format(new Date(y, m - 1, d));
}

export function hoyLocal(sumarDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + sumarDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Días que faltan (negativo si ya pasó) para una fecha AAAA-MM-DD.
export function diasHasta(aaaammdd) {
  const [y, m, d] = aaaammdd.split("-").map(Number);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - hoy) / 86400000);
}

// ---- Reglas de cantidad por unidad (igual que en el servidor) -------------------
export const reglaUnidad = {
  kg: { paso: "0.001", decimales: 3, ayuda: "Hasta 3 decimales (1 gramo = 0.001 kg)." },
  l: { paso: "0.001", decimales: 3, ayuda: "Hasta 3 decimales (1 ml = 0.001 l)." },
  g: { paso: "1", decimales: 0, ayuda: "Solo números enteros." },
  ml: { paso: "1", decimales: 0, ayuda: "Solo números enteros." },
  pza: { paso: "0.25", decimales: 2, ayuda: "Enteros, ½, ¼ o ¾ (múltiplos de 0.25)." },
};

// Devuelve un mensaje de error o "" si la cantidad es válida para la unidad.
export function validarCantidad(valor, unidad) {
  if (!Number.isFinite(valor)) return "Escribe un número";
  if (unidad === "pza") return Math.abs(valor * 4 - Math.round(valor * 4)) < 1e-9 ? "" : "En piezas solo se permiten múltiplos de 0.25";
  if (unidad === "g" || unidad === "ml") return Number.isInteger(valor) ? "" : `En ${unidad} solo se permiten números enteros`;
  return Math.abs(valor * 1000 - Math.round(valor * 1000)) < 1e-6 ? "" : `En ${unidad} se permiten hasta 3 decimales`;
}

// ---- Avisos (toast) --------------------------------------------------------------
export function aviso(mensaje, tipo = "exito") {
  const contenedor = document.getElementById("avisos");
  const icono = { exito: "check-circle-fill", error: "exclamation-triangle-fill", info: "info-circle-fill" }[tipo];
  const color = { exito: "text-success", error: "text-danger", info: "text-primary" }[tipo];
  const el = document.createElement("div");
  el.className = "toast align-items-center";
  el.setAttribute("role", tipo === "error" ? "alert" : "status");
  el.innerHTML = `<div class="d-flex"><div class="toast-body d-flex gap-2 align-items-start">
      <i class="bi bi-${icono} ${color}"></i><span></span></div>
      <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>`;
  el.querySelector("span").textContent = mensaje;
  contenedor.appendChild(el);
  const t = new bootstrap.Toast(el, { delay: tipo === "error" ? 7000 : 3500 });
  el.addEventListener("hidden.bs.toast", () => el.remove());
  t.show();
}

// ---- Confirmación en un modal ----------------------------------------------------
export function confirmar({ titulo, mensaje, boton = "Aceptar", peligro = false }) {
  return new Promise((resolver) => {
    const el = document.createElement("div");
    el.className = "modal fade";
    el.tabIndex = -1;
    el.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <div class="modal-header"><h2 class="modal-title fs-5"></h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
      <div class="modal-body"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn ${peligro ? "btn-danger" : "btn-primary"}" data-ok></button>
      </div></div></div>`;
    el.querySelector(".modal-title").textContent = titulo;
    el.querySelector(".modal-body").textContent = mensaje;
    el.querySelector("[data-ok]").textContent = boton;
    document.body.appendChild(el);
    const modal = new bootstrap.Modal(el);
    let aceptado = false;
    el.querySelector("[data-ok]").addEventListener("click", () => { aceptado = true; modal.hide(); });
    el.addEventListener("hidden.bs.modal", () => { el.remove(); resolver(aceptado); });
    modal.show();
  });
}

// Evita llamar a la API en cada tecla mientras se escribe.
export function retrasar(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Muestra errores del servidor ({campo, mensaje}) junto a los campos del formulario.
export function mostrarErroresCampos(formulario, detalles) {
  let primero = null;
  limpiarErroresCampos(formulario);
  for (const { campo, mensaje } of detalles || []) {
    const input = formulario.elements[campo];
    if (!input) continue;
    input.classList.add("is-invalid");
    const fb = formulario.querySelector(`[data-error-de="${campo}"]`);
    if (fb) fb.textContent = mensaje;
    primero = primero || input;
  }
  if (primero) primero.focus();
  return Boolean(primero);
}
export function limpiarErroresCampos(formulario) {
  formulario.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  formulario.querySelectorAll("[data-error-de]").forEach((el) => (el.textContent = ""));
}
export function ponerErrorCampo(formulario, campo, mensaje) {
  mostrarErroresCampos(formulario, [{ campo, mensaje }]);
}

// Botón con "cargando" mientras se espera a la API.
export async function conCarga(boton, fn) {
  const textoOriginal = boton.innerHTML;
  boton.disabled = true;
  boton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Guardando…`;
  try { return await fn(); }
  finally { boton.disabled = false; boton.innerHTML = textoOriginal; }
}
