import { api } from "../api.js";
import { html, pintar, aviso, confirmar, conCarga, mostrarErroresCampos, limpiarErroresCampos, ponerErrorCampo } from "../utils.js";
import { vacio } from "../componentes/estado.js";

// Abre un modal para crear o editar una categoría. `categoria` es el objeto a editar (si se pasa) y `alGuardar` es la función que se llama al guardar los cambios.
function abrirFormulario({ categoria = null, alGuardar }) {
  const el = document.createElement("div");
  el.className = "modal fade";
  el.tabIndex = -1;
  pintar(el, html`<div class="modal-dialog modal-dialog-centered"><div class="modal-content"><form novalidate>
    <div class="modal-header"><h2 class="modal-title fs-5">${categoria ? "Editar categoría" : "Nueva categoría"}</h2>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
    <div class="modal-body d-grid gap-3">
      <div><label class="form-label" for="c-nombre">Nombre</label>
        <input class="form-control" id="c-nombre" name="nombre" maxlength="60" required value="${categoria ? categoria.nombre : ""}">
        <div class="invalid-feedback" data-error-de="nombre"></div></div>
      <div><label class="form-label" for="c-desc">Descripción <span class="text-secondary fw-normal">(opcional)</span></label>
        <input class="form-control" id="c-desc" name="descripcion" maxlength="200" value="${categoria && categoria.descripcion ? categoria.descripcion : ""}">
        <div class="invalid-feedback" data-error-de="descripcion"></div></div>
      <div class="alert alert-danger py-2 mb-0" role="alert" data-error-general hidden></div>
    </div>
    <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button type="submit" class="btn btn-primary">${categoria ? "Guardar cambios" : "Crear categoría"}</button></div>
  </form></div></div>`);
  document.body.appendChild(el);
  const modal = new bootstrap.Modal(el);
  const form = el.querySelector("form");
  const errorGeneral = el.querySelector("[data-error-general]");
  el.addEventListener("shown.bs.modal", () => form.elements.nombre.focus());
  el.addEventListener("hidden.bs.modal", () => el.remove());

  // Maneja el envío del formulario y muestra errores de red o de datos. Si la creación o edición es correcta, cierra el modal, muestra un aviso y llama a `alGuardar`.
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    limpiarErroresCampos(form);
    errorGeneral.hidden = true;
    const nombre = form.elements.nombre.value.trim();
    if (!nombre) return ponerErrorCampo(form, "nombre", "Escribe el nombre de la categoría");
    const cuerpo = { nombre, descripcion: form.elements.descripcion.value.trim() || null };
    try {
      await conCarga(form.querySelector('[type="submit"]'), () => (categoria ? api.put(`/categorias/${categoria.id_categoria}`, cuerpo) : api.post("/categorias", cuerpo)));
      modal.hide();
      aviso(categoria ? "Categoría actualizada." : `Categoría creada: ${nombre}.`);
      alGuardar();
    } catch (e) {
      if (!mostrarErroresCampos(form, e.detalles)) { errorGeneral.textContent = e.message; errorGeneral.hidden = false; }
    }
  });
  modal.show();
}

// Monta la vista de categorías en `contenedor`. Carga la lista de categorías y muestra errores de red o de datos. Permite crear, editar y eliminar categorías.
export async function montar(contenedor) {
  pintar(contenedor, html`
    <div class="cabecera">
      <div><h1>Categorías</h1><p>Agrupan tus productos: granos, lácteos, limpieza…</p></div>
      <button class="btn btn-primary" id="nueva"><i class="bi bi-plus-lg"></i> Nueva categoría</button>
    </div>
    <section class="panel"><div id="lista" aria-live="polite"></div></section>`);

  const lista = contenedor.querySelector("#lista");

  // Carga la lista de categorías y pinta la tabla. Si no hay categorías, muestra un mensaje. Permite editar y eliminar categorías.
  async function cargar() {
    let categorias;
    try { categorias = (await api.get("/categorias")).datos; }
    catch (e) { pintar(lista, vacio("wifi-off", "No se pudieron cargar las categorías", e.message)); return; }

    if (!categorias.length) {
      pintar(lista, vacio("tags", "Aún no hay categorías", "Crea la primera para poder registrar productos."));
      return;
    }
    pintar(lista, html`<ul class="list-unstyled m-0">${categorias.map((c, i) => html`
      <li class="${i ? "separador" : ""} d-flex align-items-center justify-content-between gap-3 px-3 py-3">
        <div class="min-w-0">
          <div class="nombre-prod">${c.nombre}</div>
          <div class="sub">${c.descripcion || "Sin descripción"}</div>
        </div>
        <div class="d-flex align-items-center gap-2 flex-shrink-0">
          <a class="chip text-decoration-none" href="#/productos?categoria=${c.id_categoria}" title="Ver los productos de esta categoría">${c.total_productos} ${c.total_productos === 1 ? "producto" : "productos"}</a>
          <button class="btn btn-sm btn-outline-secondary" data-editar="${c.id_categoria}" title="Editar"><i class="bi bi-pencil"></i><span class="visually-hidden">Editar ${c.nombre}</span></button>
          <button class="btn btn-sm btn-outline-secondary" data-borrar="${c.id_categoria}" title="Eliminar"><i class="bi bi-trash3"></i><span class="visually-hidden">Eliminar ${c.nombre}</span></button>
        </div>
      </li>`)}</ul>`);

    const porId = new Map(categorias.map((c) => [c.id_categoria, c]));
    lista.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () =>
      abrirFormulario({ categoria: porId.get(Number(b.dataset.editar)), alGuardar: cargar })));
    lista.querySelectorAll("[data-borrar]").forEach((b) => b.addEventListener("click", async () => {
      const c = porId.get(Number(b.dataset.borrar));
      if (c.total_productos > 0) {
        aviso(`"${c.nombre}" tiene ${c.total_productos} producto(s). Mueve o desactiva esos productos antes de eliminarla.`, "error");
        return;
      }
      const ok = await confirmar({ titulo: "Eliminar categoría", mensaje: `Se eliminará "${c.nombre}". Esta acción no se puede deshacer.`, boton: "Eliminar", peligro: true });
      if (!ok) return;
      try { await api.del(`/categorias/${c.id_categoria}`); aviso(`Categoría eliminada: ${c.nombre}.`); cargar(); }
      catch (e) { aviso(e.message, "error"); }
    }));
  }

  // Permite crear una nueva categoría. Al guardar, recarga la lista.
  contenedor.querySelector("#nueva").addEventListener("click", () => abrirFormulario({ alGuardar: cargar }));
  await cargar();
}
