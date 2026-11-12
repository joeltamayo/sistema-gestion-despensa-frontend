// Router por hash: #/ruta?filtro=valor. Cada vista exporta montar(contenedor, ctx) y puede devolver una función de limpieza.
import { pintar, html } from "./utils.js";

const rutas = [];
let limpieza = null;
let contador = 0;

// Registra una ruta: patron es un regex, cargarVista() devuelve el módulo de la vista.
export function registrar(patron, cargarVista, opciones = {}) {
  rutas.push({ patron, cargarVista, ...opciones });
}

// Devuelve { ruta, query } de la URL actual (hash).
export function parsearHash() {
  const crudo = location.hash.replace(/^#/, "") || "/";
  const [ruta, consulta = ""] = crudo.split("?");
  return { ruta: ruta || "/", query: Object.fromEntries(new URLSearchParams(consulta)) };
}

// Cambia el hash y dispara el evento "hashchange" (para navegar a otra vista).
export function navegar(ruta) { location.hash = ruta; }

// Cambia el hash sin volver a montar la vista (para guardar filtros en la URL).
export function reemplazarHash(ruta) { history.replaceState(null, "", `#${ruta}`); }

// Llama a alCambiar({ ruta, publica, titulo, seccion }) y monta la vista correspondiente en contenedor.
export async function resolver({ contenedor, usuario, alCambiar }) {
  const { ruta, query } = parsearHash();
  const yo = ++contador;
  const coincide = rutas.map((r) => ({ r, m: ruta.match(r.patron) })).find((x) => x.m);

  if (typeof limpieza === "function") { try { limpieza(); } catch { /* nada */ } }
  limpieza = null;

  if (!coincide) {
    alCambiar({ ruta, publica: false, titulo: "No encontrada" });
    pintar(contenedor, html`<div class="vacio"><i class="bi bi-compass"></i><h2>Esta página no existe</h2>
      <p>Revisa la dirección o vuelve al <a href="#/">inicio</a>.</p></div>`);
    return;
  }
  const { r, m } = coincide;
  if (!r.publica && !usuario) { location.hash = "#/login"; return; }
  if (r.publica && usuario && ruta === "/login") { location.hash = "#/"; return; }

  alCambiar({ ruta, publica: Boolean(r.publica), titulo: r.titulo, seccion: r.seccion });
  contenedor.innerHTML = `<div class="cargando"><div class="spinner-border text-primary" role="status"></div><span>Cargando…</span></div>`;
  const modulo = await r.cargarVista();
  if (yo !== contador) return; // el usuario ya navegó a otra parte
  const resultado = await modulo.montar(contenedor, { params: m.slice(1), query, usuario });
  if (yo !== contador) { if (typeof resultado === "function") resultado(); return; }
  limpieza = resultado;
}
