import { api } from "../api.js";
import { html, pintar, raw, aviso, confirmar, retrasar } from "../utils.js";
import { LIMITES } from "../config.js";
import { reemplazarHash } from "../router.js";
import { pie, enlazar } from "../componentes/paginacion.js";
import { medidor, chipCaducidad, vacio } from "../componentes/estado.js";
import { abrirMovimiento } from "../componentes/movimientoModal.js";

// Listado de productos, con filtros y paginación.
const PREDETERMINADO = { q: "", categoria: "", estado: "activos", caducidad: "", bajo_stock: "", orden: "nombre", dir: "asc", limit: "10", page: "1" };

// Monta la vista de productos en `contenedor`. `query` son los filtros iniciales (de la URL).
export async function montar(contenedor, { query }) {
  const f = { ...PREDETERMINADO, ...query };
  let categorias = [];
  try { categorias = (await api.get("/categorias")).datos; } catch { /* el listado avisará si la API falla */ }

  const opciones = (lista, actual) => lista.map(([v, t]) => html`<option value="${v}" ${v === String(actual) ? raw("selected") : ""}>${t}</option>`);

  pintar(contenedor, html`
    <div class="cabecera">
      <div><h1>Productos</h1><p>Existencias, caducidades y estado de cada producto.</p></div>
      <a class="btn btn-primary" href="#/productos/nuevo"><i class="bi bi-plus-lg"></i> Nuevo producto</a>
    </div>

    <form class="panel panel-cuerpo filtros mb-3" id="filtros" role="search" aria-label="Filtrar productos">
      <div class="amplio"><label class="form-label" for="f-q">Buscar por nombre</label>
        <input type="search" class="form-control" id="f-q" name="q" value="${f.q}" placeholder="Arroz, leche…" maxlength="100"></div>
      <div><label class="form-label" for="f-categoria">Categoría</label>
        <select class="form-select" id="f-categoria" name="categoria">
          <option value="">Todas</option>${opciones(categorias.map((c) => [c.id_categoria, c.nombre]), f.categoria)}</select></div>
      <div><label class="form-label" for="f-estado">Mostrar</label>
        <select class="form-select" id="f-estado" name="estado">${opciones([["activos", "Activos"], ["inactivos", "Desactivados"], ["todos", "Todos"]], f.estado)}</select></div>
      <div><label class="form-label" for="f-caducidad">Caducidad</label>
        <select class="form-select" id="f-caducidad" name="caducidad">${opciones([["", "Cualquiera"], ["vencidos", "Vencidos"], ["por_vencer", "Por vencer (7 días)"]], f.caducidad)}</select></div>
      <div class="d-flex align-items-end pb-1"><div class="form-check">
        <input class="form-check-input" type="checkbox" id="f-bajo" name="bajo_stock" ${f.bajo_stock === "true" ? raw("checked") : ""}>
        <label class="form-check-label" for="f-bajo">Solo poco stock</label></div></div>
      <div class="amplio"><label class="form-label" for="f-orden">Ordenar por</label>
        <div class="input-group"><select class="form-select" id="f-orden" name="orden">${opciones([["nombre", "Nombre"], ["cantidad", "Cantidad"], ["fecha_caducidad", "Caducidad"], ["created_at", "Fecha de registro"]], f.orden)}</select>
        <select class="form-select flex-grow-0 w-auto" name="dir" aria-label="Sentido del orden">${opciones([["asc", "↑ Asc."], ["desc", "↓ Desc."]], f.dir)}</select></div></div>
<div><button type="button" class="btn btn-outline-secondary w-100" id="limpiar"><i class="bi bi-x-circle"></i> Quitar filtros</button></div>
    </form>

    <section class="panel" aria-live="polite"><div id="resultado"></div></section>`);

  const form = contenedor.querySelector("#filtros");
  const resultado = contenedor.querySelector("#resultado");
  let solicitud = 0;

  const hayFiltros = () => ["q", "categoria", "caducidad", "bajo_stock"].some((k) => f[k]) || f.estado !== "activos";

  function guardarEnUrl() {
    const p = new URLSearchParams();
    for (const k of Object.keys(PREDETERMINADO)) if (f[k] !== PREDETERMINADO[k] && f[k] !== "") p.set(k, f[k]);
    const texto = p.toString();
    reemplazarHash(`/productos${texto ? "?" + texto : ""}`);
  }

  // Devuelve { acciones(producto) } con los botones de cada fila.
  function fila(p) {
    const acciones = (compacto) => html`<div class="d-flex gap-1 ${compacto ? "" : "justify-content-end"}">
      <button class="btn btn-sm btn-outline-primary" data-mov="${p.id_producto}" title="Registrar entrada o salida" ${p.activo ? "" : raw("disabled")}>
        <i class="bi bi-arrow-left-right"></i><span class="${compacto ? "" : "visually-hidden"}"> Movimiento</span></button>
      <a class="btn btn-sm btn-outline-secondary" href="#/productos/${p.id_producto}/editar" title="Editar"><i class="bi bi-pencil"></i><span class="visually-hidden">Editar ${p.nombre}</span></a>
      ${p.activo
        ? html`<button class="btn btn-sm btn-outline-secondary" data-desactivar="${p.id_producto}" title="Desactivar"><i class="bi bi-archive"></i><span class="visually-hidden">Desactivar ${p.nombre}</span></button>`
        : html`<button class="btn btn-sm btn-outline-secondary" data-reactivar="${p.id_producto}" title="Reactivar"><i class="bi bi-arrow-counterclockwise"></i><span class="visually-hidden">Reactivar ${p.nombre}</span></button>`}
    </div>`;
    return { acciones };
  }

  // Dibuja la tabla o tarjetas con los productos y los botones de cada fila.
  function dibujar(r) {
    if (r.datos.length === 0) {
      pintar(resultado, hayFiltros()
        ? vacio("search", "Sin resultados", "Ningún producto coincide con los filtros.")
        : vacio("basket3", "Aún no hay productos", "Agrega el primero para empezar a controlar tu despensa.", html`<a class="btn btn-primary" href="#/productos/nuevo">Agregar producto</a>`));
      return;
    }
    pintar(resultado, html`
      <div class="d-none d-md-block table-responsive"><table class="table tabla">
        <thead><tr><th scope="col">Producto</th><th scope="col" class="d-none d-xl-table-cell">Categoría</th><th scope="col">Existencias</th><th scope="col">Caducidad</th><th scope="col"><span class="visually-hidden">Acciones</span></th></tr></thead>
        <tbody>${r.datos.map((p) => html`<tr class="${p.activo ? "" : "inactivo"}">
          <td><div class="nombre-prod">${p.nombre}${p.activo ? "" : html` <span class="chip chip-inactivo">Desactivado</span>`}</div>
            <div class="sub">${p.marca || "Sin marca"}</div></td>
          <td class="d-none d-xl-table-cell">${p.categoria}</td>
          <td>${medidor(p)}</td>
          <td>${chipCaducidad(p)}</td>
          <td>${fila(p).acciones(false)}</td></tr>`)}</tbody></table></div>

      <div class="d-md-none tarjeta-lista">${r.datos.map((p) => html`<article class="tarjeta-item ${p.activo ? "" : "inactivo"}">
        <div class="d-flex justify-content-between gap-2">
          <div class="min-w-0"><div class="nombre-prod">${p.nombre}</div>
            <div class="sub">${p.marca ? p.marca + " · " : ""}${p.categoria}${p.activo ? "" : " · Desactivado"}</div></div>
          ${chipCaducidad(p)}</div>
        <div class="my-2">${medidor(p)}</div>
        ${fila(p).acciones(true)}</article>`)}</div>
      ${pie(r.paginacion)}`);

    enlazar(resultado, (n) => { f.page = String(n); cargar(); contenedor.scrollIntoView({ behavior: "smooth", block: "start" }); });
    const porId = new Map(r.datos.map((p) => [p.id_producto, p]));

    resultado.querySelectorAll("[data-mov]").forEach((b) => b.addEventListener("click", () =>
      abrirMovimiento({ producto: porId.get(Number(b.dataset.mov)), alGuardar: cargar })));

    resultado.querySelectorAll("[data-desactivar]").forEach((b) => b.addEventListener("click", async () => {
      const p = porId.get(Number(b.dataset.desactivar));
      const ok = await confirmar({ titulo: "Desactivar producto", mensaje: `"${p.nombre}" dejará de aparecer en el listado normal, pero conserva su historial. Puedes reactivarlo cuando quieras.`, boton: "Desactivar", peligro: true });
      if (!ok) return;
      try { await api.del(`/productos/${p.id_producto}`); aviso(`Desactivado: ${p.nombre}`); cargar(); }
      catch (e) { aviso(e.message, "error"); }
    }));
    resultado.querySelectorAll("[data-reactivar]").forEach((b) => b.addEventListener("click", async () => {
      const p = porId.get(Number(b.dataset.reactivar));
      try { await api.patch(`/productos/${p.id_producto}/reactivar`); aviso(`Reactivado: ${p.nombre}`); cargar(); }
      catch (e) { aviso(e.message, "error"); }
    }));
  }

  async function cargar() {
    const yo = ++solicitud;
    guardarEnUrl();
    try {
      const r = await api.get("/productos", { q: f.q, categoria: f.categoria, estado: f.estado, caducidad: f.caducidad, bajo_stock: f.bajo_stock, orden: f.orden, dir: f.dir, limit: f.limit, page: f.page });
      if (yo !== solicitud) return;
      // Si se borró el último elemento de la última página, vuelve a la anterior.
      if (r.datos.length === 0 && r.paginacion.pagina > 1) { f.page = String(r.paginacion.paginas); return cargar(); }
      dibujar(r);
    } catch (e) {
      if (yo === solicitud) pintar(resultado, vacio("wifi-off", "No se pudo cargar la lista", e.message));
    }
  }

  const cambio = (ev) => {
    const el = ev.target;
    if (!el.name) return;
    f[el.name] = el.type === "checkbox" ? (el.checked ? "true" : "") : el.value;
    f.page = "1";
    cargar();
  };
  form.addEventListener("change", cambio);
  form.addEventListener("input", retrasar((ev) => { if (ev.target.name === "q") cambio(ev); }, 300));
  form.addEventListener("submit", (ev) => ev.preventDefault());
  contenedor.querySelector("#limpiar").addEventListener("click", () => {
    Object.assign(f, { ...PREDETERMINADO, limit: f.limit });
    form.reset();
    form.elements.estado.value = "activos";
    form.elements.orden.value = "nombre";
    form.elements.dir.value = "asc";
    cargar();
  });

  // Selector de cuántos por página (debajo de la lista).
  contenedor.insertAdjacentHTML("beforeend", `<div class="d-flex justify-content-end align-items-center gap-2 mt-2">
    <label class="sub" for="f-limit">Por página</label>
    <select id="f-limit" class="form-select form-select-sm w-auto">${LIMITES.map((n) => `<option value="${n}" ${String(n) === f.limit ? "selected" : ""}>${n}</option>`).join("")}</select></div>`);
  contenedor.querySelector("#f-limit").addEventListener("change", (ev) => { f.limit = ev.target.value; f.page = "1"; cargar(); });

  await cargar();
}
