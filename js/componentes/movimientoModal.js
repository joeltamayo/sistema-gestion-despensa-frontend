// Ventana para registrar una entrada o salida de un producto.
import { api } from "../api.js";
import { html, pintar, aviso, conCarga, reglaUnidad, validarCantidad, cantidadTexto, mostrarErroresCampos, ponerErrorCampo, limpiarErroresCampos } from "../utils.js";
import { crearSelector } from "./selectorProducto.js";

// abrirMovimiento({ producto?, tipo?, alGuardar }) — si no hay producto, deja elegirlo.
export function abrirMovimiento({ producto = null, tipo = "salida", alGuardar = () => { } }) {
  const el = document.createElement("div");
  el.className = "modal fade";
  el.tabIndex = -1;
  pintar(el, html`<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <form novalidate>
      <div class="modal-header"><h2 class="modal-title fs-5">Registrar movimiento</h2>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
      <div class="modal-body d-grid gap-3">
        <div data-zona-producto></div>
        <div>
          <div class="form-label" id="etq-tipo">Tipo</div>
          <div class="btn-group tipo-mov w-100" role="group" aria-labelledby="etq-tipo">
            <input type="radio" class="btn-check" name="tipo" id="t-entrada" value="entrada" ${tipo === "entrada" ? "checked" : ""}>
            <label class="btn btn-outline-secondary btn-entrada" for="t-entrada"><i class="bi bi-box-arrow-in-down"></i> Entrada</label>
            <input type="radio" class="btn-check" name="tipo" id="t-salida" value="salida" ${tipo === "salida" ? "checked" : ""}>
            <label class="btn btn-outline-secondary btn-salida" for="t-salida"><i class="bi bi-box-arrow-up"></i> Salida</label>
          </div>
          <div class="form-text" data-ayuda-tipo></div>
        </div>
        <div>
          <label class="form-label" for="m-cantidad">Cantidad</label>
          <div class="input-group">
            <input type="number" class="form-control" id="m-cantidad" name="cantidad" min="0" inputmode="decimal" required>
            <span class="input-group-text" data-unidad>—</span>
            <div class="invalid-feedback" data-error-de="cantidad"></div>
          </div>
          <div class="form-text" data-ayuda-cantidad>Elige primero un producto.</div>
        </div>
        <div>
          <label class="form-label" for="m-motivo">Motivo <span class="text-secondary fw-normal">(opcional)</span></label>
          <input type="text" class="form-control" id="m-motivo" name="motivo" maxlength="150" placeholder="Compra, desayuno, se tiró…">
          <div class="invalid-feedback" data-error-de="motivo"></div>
        </div>
        <div class="alert alert-danger py-2 mb-0" data-error-general hidden role="alert"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar</button>
      </div>
    </form></div></div>`);
  document.body.appendChild(el);

  const form = el.querySelector("form");
  const errorGeneral = el.querySelector("[data-error-general]");
  let actual = producto;

  // Actualiza la unidad y el paso del campo de cantidad según el producto elegido. Si no hay producto, muestra "—" como unidad.
  const actualizarUnidad = () => {
    const entrada = form.elements.cantidad;
    if (!actual) { el.querySelector("[data-unidad]").textContent = "—"; return; }
    const regla = reglaUnidad[actual.unidad];
    entrada.step = regla.paso;
    el.querySelector("[data-unidad]").textContent = actual.unidad;
    el.querySelector("[data-ayuda-cantidad]").textContent = `Existencias: ${cantidadTexto(actual.cantidad, actual.unidad)} ${actual.unidad}. ${regla.ayuda}`;
  };
  const actualizarAyudaTipo = () => {
    el.querySelector("[data-ayuda-tipo]").textContent =
      form.elements.tipo.value === "entrada" ? "Suma a las existencias (compra, regalo…)." : "Resta de las existencias (consumo, merma…).";
  };

  const zona = el.querySelector("[data-zona-producto]");
  let selector = null;
  if (producto) {
    pintar(zona, html`<div class="form-label">Producto</div>
      <div class="fw-bold">${producto.nombre}${producto.marca ? html` <span class="sub">· ${producto.marca}</span>` : ""}</div>`);
  } else {
    selector = crearSelector(zona, { id: "m-producto", etiqueta: "Producto", alElegir: (p) => { actual = p; actualizarUnidad(); } });
  }
  actualizarUnidad();
  actualizarAyudaTipo();
  form.querySelectorAll('input[name="tipo"]').forEach((r) => r.addEventListener("change", actualizarAyudaTipo));

  const modal = new bootstrap.Modal(el);
  el.addEventListener("shown.bs.modal", () => (producto ? form.elements.cantidad : el.querySelector("#m-producto")).focus());
  el.addEventListener("hidden.bs.modal", () => { if (selector) selector.destruir(); el.remove(); });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    limpiarErroresCampos(form);
    errorGeneral.hidden = true;
    if (!actual) { errorGeneral.textContent = "Elige un producto."; errorGeneral.hidden = false; return; }
    const cantidad = form.elements.cantidad.valueAsNumber;
    if (!(cantidad > 0)) return ponerErrorCampo(form, "cantidad", "La cantidad debe ser mayor que 0");
    const mensaje = validarCantidad(cantidad, actual.unidad);
    if (mensaje) return ponerErrorCampo(form, "cantidad", mensaje);

    const tipoElegido = form.elements.tipo.value;
    try {
      const r = await conCarga(form.querySelector('[type="submit"]'), () =>
        api.post("/movimientos", { id_producto: actual.id_producto, tipo: tipoElegido, cantidad, motivo: form.elements.motivo.value.trim() || null })
      );
      modal.hide();
      aviso(`${tipoElegido === "entrada" ? "Entrada" : "Salida"} registrada: ahora hay ${cantidadTexto(r.existencias_actuales.cantidad, r.existencias_actuales.unidad)} ${r.existencias_actuales.unidad} de ${actual.nombre}.`);
      alGuardar(r);
    } catch (e) {
      if (!mostrarErroresCampos(form, e.detalles)) {
        if (e.status === 409 && /insuficientes/i.test(e.message)) ponerErrorCampo(form, "cantidad", e.message);
        else { errorGeneral.textContent = e.message; errorGeneral.hidden = false; }
      }
    }
  });

  modal.show();
}
