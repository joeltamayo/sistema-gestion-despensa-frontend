import { api } from "../api.js";
import { html, pintar, raw, aviso, conCarga, reglaUnidad, validarCantidad, mostrarErroresCampos, ponerErrorCampo, limpiarErroresCampos, cantidadTexto, hoyLocal } from "../utils.js";
import { UNIDADES } from "../config.js";
import { navegar } from "../router.js";
import { vacio } from "../componentes/estado.js";

// Monta el formulario de producto en `contenedor`. `params` son los parámetros de la ruta (el id del producto si se edita).
export async function montar(contenedor, { params }) {
  const id = params[0] ? Number(params[0]) : null;
  const editando = id !== null;

  // Si hay un id, carga el producto y las categorías; si no, solo las categorías. Maneja errores de red o 404.
  let categorias, producto = null;
  try {
    categorias = (await api.get("/categorias")).datos;
    if (editando) producto = (await api.get(`/productos/${id}`)).producto;
  } catch (e) {
    pintar(contenedor, vacio(e.status === 404 ? "question-circle" : "wifi-off", e.status === 404 ? "Ese producto no existe" : "No se pudo cargar el formulario", e.message,
      html`<a class="btn btn-outline-primary" href="#/productos">Volver a productos</a>`));
    return;
  }

  // Si no hay categorías, muestra un mensaje y un botón para ir a la vista de categorías.
  if (categorias.length === 0) {
    pintar(contenedor, vacio("tags", "Primero crea una categoría", "Cada producto pertenece a una categoría (granos, lácteos, limpieza…).",
      html`<a class="btn btn-primary" href="#/categorias">Ir a categorías</a>`));
    return;
  }

  // Prepara los datos del producto (si se edita) y pinta el formulario.
  const p = producto || { nombre: "", marca: "", id_categoria: "", unidad: "kg", cantidad: 0, stock_minimo: 0, fecha_caducidad: "" };
  const bloqueaUnidad = editando && p.cantidad > 0;

  // Pinta el formulario con los campos y botones. Los campos de cantidad y unidad se ajustan según la unidad elegida.
  pintar(contenedor, html`
    <div class="cabecera">
      <div><h1>${editando ? "Editar producto" : "Nuevo producto"}</h1>
        <p>${editando ? "Cambia los datos del producto. Las existencias se modifican con movimientos." : "Registra qué es, cuánto tienes y cuándo caduca."}</p></div>
    </div>
    <form class="panel panel-cuerpo" id="form" novalidate style="max-width:46rem">
      <div class="row g-3">
        <div class="col-12 col-md-7">
          <label class="form-label" for="nombre">Nombre</label>
          <input class="form-control" id="nombre" name="nombre" maxlength="100" required value="${p.nombre}" autofocus>
          <div class="invalid-feedback" data-error-de="nombre"></div>
        </div>
        <div class="col-12 col-md-5">
          <label class="form-label" for="marca">Marca <span class="text-secondary fw-normal">(opcional)</span></label>
          <input class="form-control" id="marca" name="marca" maxlength="60" value="${p.marca || ""}">
          <div class="invalid-feedback" data-error-de="marca"></div>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label" for="id_categoria">Categoría</label>
          <select class="form-select" id="id_categoria" name="id_categoria" required>
            <option value="">Elige una categoría…</option>
            ${categorias.map((c) => html`<option value="${c.id_categoria}" ${c.id_categoria === p.id_categoria ? raw("selected") : ""}>${c.nombre}</option>`)}
          </select>
          <div class="invalid-feedback" data-error-de="id_categoria"></div>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label" for="unidad">Unidad de medida</label>
          <select class="form-select" id="unidad" name="unidad" ${bloqueaUnidad ? raw("disabled") : ""}>
            ${UNIDADES.map((u) => html`<option value="${u.valor}" ${u.valor === p.unidad ? raw("selected") : ""}>${u.nombre}</option>`)}
          </select>
          <div class="form-text">${bloqueaUnidad ? "No se puede cambiar mientras haya existencias." : "Define cómo se cuentan las existencias."}</div>
          <div class="invalid-feedback" data-error-de="unidad"></div>
        </div>
        ${editando ? html`
          <div class="col-12 col-md-6"><div class="form-label">Existencias actuales</div>
            <div class="fw-bold fs-5">${cantidadTexto(p.cantidad, p.unidad)} ${p.unidad}</div>
            <div class="form-text">Para sumar o restar, registra un movimiento desde la lista de productos.</div></div>`
        : html`
          <div class="col-12 col-md-6">
            <label class="form-label" for="cantidad">Cantidad inicial</label>
            <input class="form-control" type="number" id="cantidad" name="cantidad" min="0" value="0" inputmode="decimal">
            <div class="form-text" data-ayuda="cantidad"></div>
            <div class="invalid-feedback" data-error-de="cantidad"></div>
          </div>`}
        <div class="col-12 col-md-6">
          <label class="form-label" for="stock_minimo">Stock mínimo</label>
          <input class="form-control" type="number" id="stock_minimo" name="stock_minimo" min="0" value="${p.stock_minimo}" inputmode="decimal">
          <div class="form-text">Se avisa cuando las existencias llegan a esta cantidad. <span data-ayuda="stock_minimo"></span></div>
          <div class="invalid-feedback" data-error-de="stock_minimo"></div>
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label" for="fecha_caducidad">Fecha de caducidad <span class="text-secondary fw-normal">(opcional)</span></label>
          <input class="form-control" type="date" id="fecha_caducidad" name="fecha_caducidad" value="${p.fecha_caducidad || ""}" min="2000-01-01" max="2100-12-31">
          <div class="form-text">Déjala vacía si el producto no caduca (limpieza, sal…).</div>
          <div class="invalid-feedback" data-error-de="fecha_caducidad"></div>
        </div>
      </div>
      <div class="alert alert-danger mt-3 mb-0" data-error-general hidden role="alert"></div>
      <div class="d-flex gap-2 justify-content-end mt-4">
        <a class="btn btn-outline-secondary" href="#/productos">Cancelar</a>
        <button class="btn btn-primary" type="submit">${editando ? "Guardar cambios" : "Agregar producto"}</button>
      </div>
    </form>`);

  const form = contenedor.querySelector("#form");
  const errorGeneral = contenedor.querySelector("[data-error-general]");
  const unidadActual = () => (form.elements.unidad.disabled ? p.unidad : form.elements.unidad.value);

  // Ajusta los pasos y ayuda de los campos de cantidad y stock mínimo según la unidad elegida.
  const ajustarUnidad = () => {
    const regla = reglaUnidad[unidadActual()];
    for (const campo of ["cantidad", "stock_minimo"]) {
      if (!form.elements[campo]) continue;
      form.elements[campo].step = regla.paso;
      const ayuda = form.querySelector(`[data-ayuda="${campo}"]`);
      if (ayuda) ayuda.textContent = regla.ayuda;
    }
  };
  form.elements.unidad.addEventListener("change", ajustarUnidad);
  ajustarUnidad();

  // Maneja el envío del formulario: valida, llama a la API y muestra errores o redirige a la lista de productos.
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    limpiarErroresCampos(form);
    errorGeneral.hidden = true;
    const el = form.elements;
    const unidad = unidadActual();

    const nombre = el.nombre.value.trim();
    if (!nombre) return ponerErrorCampo(form, "nombre", "Escribe el nombre del producto");
    if (!el.id_categoria.value) return ponerErrorCampo(form, "id_categoria", "Elige una categoría");

    const stockMinimo = el.stock_minimo.value === "" ? 0 : el.stock_minimo.valueAsNumber;
    const errores = [];
    const errMin = stockMinimo < 0 ? "No puede ser negativo" : validarCantidad(stockMinimo, unidad);
    if (errMin) errores.push({ campo: "stock_minimo", mensaje: errMin });

    const cuerpo = {
      nombre,
      marca: el.marca.value.trim() || null,
      id_categoria: Number(el.id_categoria.value),
      unidad,
      stock_minimo: stockMinimo,
      fecha_caducidad: el.fecha_caducidad.value || null,
    };
    if (!editando) {
      const cantidad = el.cantidad.value === "" ? 0 : el.cantidad.valueAsNumber;
      const errCant = cantidad < 0 ? "No puede ser negativa" : validarCantidad(cantidad, unidad);
      if (errCant) errores.push({ campo: "cantidad", mensaje: errCant });
      cuerpo.cantidad = cantidad;
    }
    if (errores.length) return mostrarErroresCampos(form, errores);

    try {
      await conCarga(form.querySelector('[type="submit"]'), () => (editando ? api.put(`/productos/${id}`, cuerpo) : api.post("/productos", cuerpo)));
      aviso(editando ? `Cambios guardados en ${nombre}.` : `Agregado: ${nombre}.`);
      navegar("/productos");
    } catch (e) {
      if (!mostrarErroresCampos(form, e.detalles)) { errorGeneral.textContent = e.message; errorGeneral.hidden = false; }
      else if (e.status === 409) { errorGeneral.textContent = e.message; errorGeneral.hidden = false; }
    }
  });
}
