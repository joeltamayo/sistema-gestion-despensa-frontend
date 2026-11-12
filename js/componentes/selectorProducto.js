// Buscador de producto: escribe parte del nombre y elige de la lista.
import { api } from "../api.js";
import { html, pintar, retrasar, cantidadTexto } from "../utils.js";

/**
 * Crea el selector dentro de `contenedor`.
 * opciones: { id, etiqueta, placeholder, soloActivos, alElegir(producto|null) }
 * Devuelve { obtener(), elegir(producto), limpiar() }.
 */
export function crearSelector(contenedor, { id, etiqueta, placeholder = "Escribe el nombre…", soloActivos = true, alElegir = () => { } }) {
  let elegido = null;

  // Pinta el HTML del selector y obtiene referencias a los elementos.
  pintar(contenedor, html`<div class="selector">
    ${etiqueta ? html`<label class="form-label" for="${id}">${etiqueta}</label>` : ""}
    <div data-zona-elegido hidden class="selector-elegido form-control">
      <span data-nombre class="text-truncate"></span>
      <button type="button" class="btn-close" data-quitar aria-label="Quitar producto"></button>
    </div>
    <input type="search" class="form-control" id="${id}" placeholder="${placeholder}" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="${id}-lista" data-buscar>
    <div class="selector-lista" id="${id}-lista" role="listbox" hidden></div>
  </div>`);

  const entrada = contenedor.querySelector("[data-buscar]");
  const lista = contenedor.querySelector(".selector-lista");
  const zona = contenedor.querySelector("[data-zona-elegido]");

  const cerrar = () => { lista.hidden = true; entrada.setAttribute("aria-expanded", "false"); };

  // Elige un producto de la lista. Si `producto` es null, se quita la elección. Llama a `alElegir(producto|null)`.
  function elegir(producto) {
    elegido = producto;
    if (producto) {
      zona.hidden = false;
      zona.querySelector("[data-nombre]").textContent = producto.nombre + (producto.marca ? ` · ${producto.marca}` : "");
      entrada.hidden = true;
    } else {
      zona.hidden = true;
      entrada.hidden = false;
      entrada.value = "";
    }
    cerrar();
    alElegir(producto);
  }

  // Busca productos según lo que se escribe en el campo de entrada. Muestra la lista de resultados o un mensaje si no hay resultados o hay un error.
  const buscar = retrasar(async () => {
    const q = entrada.value.trim();
    try {
      const r = await api.get("/productos", { q, limit: 10, estado: soloActivos ? "activos" : "todos" });
      lista.hidden = false;
      entrada.setAttribute("aria-expanded", "true");
      if (!r.datos.length) {
        pintar(lista, html`<div class="selector-vacio">${q ? "No hay productos con ese nombre." : "Todavía no hay productos."}</div>`);
        return;
      }
      pintar(lista, html`${r.datos.map((p, i) => html`<button type="button" role="option" data-i="${i}">
        <span class="text-truncate">${p.nombre}${p.marca ? html` <span class="sub">· ${p.marca}</span>` : ""}</span>
        <span class="sub text-nowrap">${cantidadTexto(p.cantidad, p.unidad)} ${p.unidad}</span></button>`)}`);
      lista.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => elegir(r.datos[Number(b.dataset.i)])));
    } catch (e) {
      lista.hidden = false;
      pintar(lista, html`<div class="selector-vacio text-danger">${e.message}</div>`);
    }
  }, 250);

  entrada.addEventListener("input", buscar);
  entrada.addEventListener("focus", buscar);
  entrada.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });
  contenedor.querySelector("[data-quitar]").addEventListener("click", () => { elegir(null); entrada.focus(); });
  const fuera = (e) => { if (!contenedor.contains(e.target)) cerrar(); };
  document.addEventListener("click", fuera);

  return {
    obtener: () => elegido,
    elegir,
    limpiar: () => elegir(null),
    destruir: () => document.removeEventListener("click", fuera),
  };
}
