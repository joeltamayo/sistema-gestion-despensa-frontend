import { api } from "../api.js";
import { html, pintar, raw, fechaHoraLocal, cantidadTexto } from "../utils.js";
import { LIMITES } from "../config.js";
import { reemplazarHash } from "../router.js";
import { pie, enlazar } from "../componentes/paginacion.js";
import { vacio } from "../componentes/estado.js";
import { crearSelector } from "../componentes/selectorProducto.js";
import { abrirMovimiento } from "../componentes/movimientoModal.js";

// Los filtros predeterminados (sin parámetros en la URL). Se usan para inicializar `f` y para limpiar los filtros.
const PREDETERMINADO = { producto: "", tipo: "", desde: "", hasta: "", orden: "fecha", dir: "desc", limit: "10", page: "1" };

// Monta la vista de movimientos en `contenedor`. `query` son los parámetros de la URL (filtros y paginación).
export async function montar(contenedor, { query }) {
  const f = { ...PREDETERMINADO, ...query };
  const opciones = (lista, actual) => lista.map(([v, t]) => html`<option value="${v}" ${v === String(actual) ? raw("selected") : ""}>${t}</option>`);

  // Pinta la cabecera, el formulario de filtros y la zona de resultados. Crea el selector de producto y carga los movimientos.
  pintar(contenedor, html`
    <div class="cabecera">
      <div><h1>Movimientos</h1><p>Historial de entradas y salidas de tu despensa.</p></div>
      <button class="btn btn-primary" id="nuevo"><i class="bi bi-plus-lg"></i> Registrar movimiento</button>
    </div>

    <form class="panel panel-cuerpo filtros mb-3" id="filtros" aria-label="Filtrar movimientos">
      <div class="amplio" id="zona-producto"></div>
      <div><label class="form-label" for="f-tipo">Tipo</label>
        <select class="form-select" id="f-tipo" name="tipo">${opciones([["", "Entradas y salidas"], ["entrada", "Solo entradas"], ["salida", "Solo salidas"]], f.tipo)}</select></div>
      <div><label class="form-label" for="f-desde">Desde</label>
        <input type="date" class="form-control" id="f-desde" name="desde" value="${f.desde}"></div>
      <div><label class="form-label" for="f-hasta">Hasta</label>
        <input type="date" class="form-control" id="f-hasta" name="hasta" value="${f.hasta}"></div>
      <div class="amplio"><label class="form-label" for="f-orden">Ordenar por</label>
        <div class="input-group"><select class="form-select" id="f-orden" name="orden">${opciones([["fecha", "Fecha"], ["cantidad", "Cantidad"]], f.orden)}</select>
        <select class="form-select flex-grow-0 w-auto" name="dir" aria-label="Sentido del orden">${opciones([["desc", "↓ Desc."], ["asc", "↑ Asc."]], f.dir)}</select></div></div>
      <div><button type="button" class="btn btn-outline-secondary w-100" id="limpiar"><i class="bi bi-x-circle"></i> Quitar filtros</button></div>
    </form>
    <div class="alert alert-warning py-2" id="aviso-fechas" hidden role="alert">La fecha "desde" no puede ser posterior a "hasta".</div>

    <section class="panel" aria-live="polite"><div id="resultado"></div></section>
    <div class="d-flex justify-content-end align-items-center gap-2 mt-2">
      <label class="sub" for="f-limit">Por página</label>
      <select id="f-limit" class="form-select form-select-sm w-auto">${LIMITES.map((n) => html`<option value="${n}" ${String(n) === f.limit ? raw("selected") : ""}>${n}</option>`)}</select>
    </div>`);

  const form = contenedor.querySelector("#filtros");
  const resultado = contenedor.querySelector("#resultado");
  const avisoFechas = contenedor.querySelector("#aviso-fechas");
  let solicitud = 0;

  // Crea el selector de producto y, si hay un producto en los filtros, lo elige. Al elegir un producto, actualiza el filtro y recarga.
  const selector = crearSelector(contenedor.querySelector("#zona-producto"), {
    id: "f-producto", etiqueta: "Producto", placeholder: "Todos los productos", soloActivos: false,
    alElegir: (p) => { f.producto = p ? String(p.id_producto) : ""; f.page = "1"; cargar(); },
  });
  if (f.producto) {
    try { selector.elegir((await api.get(`/productos/${f.producto}`)).producto); } catch { f.producto = ""; }
  }

  // Carga los movimientos según los filtros y la paginación. Valida las fechas y muestra errores de red o de datos.
  const hayFiltros = () => ["producto", "tipo", "desde", "hasta"].some((k) => f[k]);
  function guardarEnUrl() {
    const p = new URLSearchParams();
    for (const k of Object.keys(PREDETERMINADO)) if (f[k] !== PREDETERMINADO[k] && f[k] !== "") p.set(k, f[k]);
    reemplazarHash(`/movimientos${p.toString() ? "?" + p : ""}`);
  }

  // Dibuja la tabla o tarjetas con los movimientos y el pie de paginación. Si no hay movimientos, muestra un mensaje según si hay filtros o no.
  function dibujar(r) {
    if (!r.datos.length) {
      pintar(resultado, hayFiltros()
        ? vacio("search", "Sin movimientos", "No hay movimientos con esos filtros.")
        : vacio("arrow-left-right", "Sin movimientos todavía", "Registra una entrada o salida para empezar el historial."));
      return;
    }
    pintar(resultado, html`
      <div class="d-none d-md-block table-responsive"><table class="table tabla">
        <thead><tr><th scope="col">Fecha</th><th scope="col">Producto</th><th scope="col">Tipo</th><th scope="col" class="text-end">Cantidad</th><th scope="col">Motivo</th><th scope="col" class="d-none d-xl-table-cell">Registró</th></tr></thead>
        <tbody>${r.datos.map((m) => html`<tr>
          <td class="text-nowrap">${fechaHoraLocal(m.fecha)}</td>
          <td class="nombre-prod">${m.producto}</td>
          <td><span class="chip chip-${m.tipo}">${m.tipo === "entrada" ? "Entrada" : "Salida"}</span></td>
          <td class="text-end cantidad">${m.tipo === "entrada" ? "+" : "−"}${cantidadTexto(m.cantidad, m.unidad)} <span class="unidad">${m.unidad}</span></td>
          <td>${m.motivo || html`<span class="sub">—</span>`}</td>
          <td class="d-none d-xl-table-cell sub">${m.usuario}</td></tr>`)}</tbody></table></div>
      <div class="d-md-none tarjeta-lista">${r.datos.map((m) => html`<article class="tarjeta-item">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="min-w-0"><div class="nombre-prod">${m.producto}</div><div class="sub">${fechaHoraLocal(m.fecha)}</div></div>
          <span class="chip chip-${m.tipo} flex-shrink-0">${m.tipo === "entrada" ? "+" : "−"}${cantidadTexto(m.cantidad, m.unidad)} ${m.unidad}</span></div>
        ${m.motivo ? html`<div class="mt-1">${m.motivo}</div>` : ""}</article>`)}</div>
      ${pie(r.paginacion)}`);
    enlazar(resultado, (n) => { f.page = String(n); cargar(); });
  }

  // Carga los movimientos según los filtros y la paginación. Valida las fechas y muestra errores de red o de datos.
  async function cargar() {
    guardarEnUrl();
    const fechasMal = f.desde && f.hasta && f.desde > f.hasta;
    avisoFechas.hidden = !fechasMal;
    if (fechasMal) return;
    const yo = ++solicitud;
    try {
      const r = await api.get("/movimientos", { producto: f.producto, tipo: f.tipo, desde: f.desde, hasta: f.hasta, orden: f.orden, dir: f.dir, limit: f.limit, page: f.page });
      if (yo === solicitud) dibujar(r);
    } catch (e) {
      if (yo === solicitud) pintar(resultado, vacio("wifi-off", "No se pudo cargar el historial", e.message));
    }
  }

  // Maneja cambios en los filtros, envío del formulario, limpiar filtros, cambio de límite y abrir el modal de nuevo movimiento.
  form.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!el.name) return;
    f[el.name] = el.value;
    f.page = "1";
    cargar();
  });
  form.addEventListener("submit", (ev) => ev.preventDefault());
  contenedor.querySelector("#limpiar").addEventListener("click", () => {
    Object.assign(f, { ...PREDETERMINADO, limit: f.limit });
    form.reset();
    form.elements.orden.value = "fecha";
    form.elements.dir.value = "desc";
    selector.elegir(null); // dispara cargar()
  });
  contenedor.querySelector("#f-limit").addEventListener("change", (ev) => { f.limit = ev.target.value; f.page = "1"; cargar(); });
  contenedor.querySelector("#nuevo").addEventListener("click", () => abrirMovimiento({ alGuardar: cargar }));

  await cargar();
  return () => selector.destruir();
}
