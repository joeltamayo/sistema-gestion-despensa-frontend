// Punto de entrada del cliente: sesión, navegación y tema.
import { api } from "./api.js";
import { registrar, resolver } from "./router.js";
import { html, pintar, aviso, raw } from "./utils.js";

let usuario = null; // usuario actual (null si no hay sesión). Se actualiza al iniciar/cerrar sesión y al resolver rutas.

// Elementos de la página
const $ = (id) => document.getElementById(id);
const appEl = $("app");
const soloEl = $("solo");
const vistaEl = $("vista");

// ---- Rutas -------------------------------------------------------------------
registrar(/^\/login$/, () => import("./vistas/login.js"), { publica: true, titulo: "Entrar" });
registrar(/^\/$/, () => import("./vistas/dashboard.js"), { titulo: "Inicio", seccion: "inicio" });
registrar(/^\/productos$/, () => import("./vistas/productos.js"), { titulo: "Productos", seccion: "productos" });
registrar(/^\/productos\/nuevo$/, () => import("./vistas/productoForm.js"), { titulo: "Nuevo producto", seccion: "productos" });
registrar(/^\/productos\/(\d+)\/editar$/, () => import("./vistas/productoForm.js"), { titulo: "Editar producto", seccion: "productos" });
registrar(/^\/movimientos$/, () => import("./vistas/movimientos.js"), { titulo: "Movimientos", seccion: "movimientos" });
registrar(/^\/categorias$/, () => import("./vistas/categorias.js"), { titulo: "Categorías", seccion: "categorias" });

// ---- Navegación ---------------------------------------------------------------
const SECCIONES = [
  { id: "inicio", ruta: "#/", icono: "house-door", texto: "Inicio" },
  { id: "productos", ruta: "#/productos", icono: "basket3", texto: "Productos" },
  { id: "movimientos", ruta: "#/movimientos", icono: "arrow-left-right", texto: "Movimientos" },
  { id: "categorias", ruta: "#/categorias", icono: "tags", texto: "Categorías" },
];

// Pinta la barra lateral e inferior según la sección activa.
function pintarNavegacion(seccionActiva) {
  const lateral = SECCIONES.map((s) => html`<a class="nav-link ${s.id === seccionActiva ? "activo" : ""}" href="${s.ruta}" ${s.id === seccionActiva ? raw('aria-current="page"') : ""}><i class="bi bi-${s.icono}"></i>${s.texto}</a>`);
  const inferior = SECCIONES.map((s) => html`<a class="${s.id === seccionActiva ? "activo" : ""}" href="${s.ruta}" ${s.id === seccionActiva ? raw('aria-current="page"') : ""}><i class="bi bi-${s.icono}"></i>${s.texto}</a>`);
  pintar($("nav-lateral"), html`${lateral}`);
  pintar($("nav-inferior"), html`${inferior}`);
}

// Cambia el título, muestra/oculta la barra lateral y llama a pintarNavegacion().
function alCambiarRuta({ publica, titulo, seccion }) {
  document.title = `${titulo ? titulo + " · " : ""}Despensa`;
  const conSesion = Boolean(usuario) && !publica;
  appEl.hidden = !conSesion;
  soloEl.hidden = conSesion;
  if (conSesion) {
    pintarNavegacion(seccion);
    const correo = $("usuario-correo");
    correo.textContent = usuario.correo;
    correo.title = usuario.correo;
    window.scrollTo(0, 0);
  }
}

function irARuta() {
  return resolver({ contenedor: usuario ? vistaEl : soloEl, usuario, alCambiar: alCambiarRuta });
}

// ---- Sesión ------------------------------------------------------------------
async function salir() {
  try { await api.post("/auth/logout"); } catch { /* aun así se limpia el cliente */ }
  usuario = null;
  location.hash = "#/login";
  if (!location.hash.includes("login")) irARuta();
  aviso("Cerraste sesión.", "info");
}
$("btn-salir").addEventListener("click", salir);
$("btn-salir-movil").addEventListener("click", salir);

window.addEventListener("sesion-iniciada", (ev) => {
  usuario = ev.detail;
  if (location.hash === "#/login" || location.hash === "") location.hash = "#/";
  else irARuta();
});
window.addEventListener("sesion-expirada", () => {
  if (!usuario) return;
  usuario = null;
  aviso("Tu sesión terminó. Vuelve a entrar.", "error");
  location.hash = "#/login";
});
window.addEventListener("hashchange", irARuta);

// ---- Tema claro / oscuro -----------------------------------------------------
function alternarTema() {
  const raiz = document.documentElement;
  const nuevo = raiz.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
  raiz.setAttribute("data-bs-theme", nuevo);
  try { localStorage.setItem("despensa.tema", nuevo); } catch { /* sin almacenamiento */ }
}
$("btn-tema").addEventListener("click", alternarTema);
$("btn-tema-movil").addEventListener("click", alternarTema);

// ---- Arranque ----------------------------------------------------------------
async function iniciar() {
  try {
    usuario = (await api.get("/auth/me")).usuario;
  } catch (e) {
    usuario = null;
    if (e.status === 0) {
      pintar(soloEl, html`<div class="acceso text-center"><div class="vacio"><i class="bi bi-plug"></i><h2>No hay conexión con el servidor</h2>
        <p>${e.message}</p><button class="btn btn-primary" id="reintentar">Reintentar</button></div></div>`);
      soloEl.hidden = false;
      $("reintentar").addEventListener("click", iniciar);
      return;
    }
  }
  if (!usuario && location.hash !== "#/login") location.hash = "#/login";
  else await irARuta();
}
iniciar();
