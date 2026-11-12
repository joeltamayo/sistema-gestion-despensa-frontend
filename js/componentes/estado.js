// Piezas visuales compartidas por las listas de productos.
import { html, cantidadTexto, fechaCorta, diasHasta } from "../utils.js";

// Barra de existencias respecto al mínimo + cantidad con su unidad.
export function medidor(p) {
  const tope = p.stock_minimo > 0 ? p.stock_minimo * 2 : Math.max(p.cantidad, 1);
  const ancho = Math.round(Math.min(1, p.cantidad / tope) * 100);
  const clase = p.cantidad === 0 ? "cero" : p.bajo_stock ? "bajo" : "";
  const estado = p.cantidad === 0 ? "Agotado" : p.bajo_stock ? "Poco stock" : "Existencias suficientes";
  return html`<div class="medidor ${clase}" title="${estado} (mínimo: ${cantidadTexto(p.stock_minimo, p.unidad)} ${p.unidad})">
    <span class="cantidad">${cantidadTexto(p.cantidad, p.unidad)} <span class="unidad">${p.unidad}</span></span>
    <span class="medidor-barra" aria-hidden="true"><span style="width:${ancho}%"></span></span>
    <span class="visually-hidden">${estado}</span>
  </div>`;
}

// Etiqueta con el estado de caducidad.
export function chipCaducidad(p) {
  if (!p.fecha_caducidad) return html`<span class="chip">Sin caducidad</span>`;
  const dias = diasHasta(p.fecha_caducidad);
  const titulo = fechaCorta(p.fecha_caducidad);
  if (p.estado_caducidad === "vencido") {
    const texto = dias === -1 ? "Venció ayer" : `Venció hace ${-dias} días`;
    return html`<span class="chip chip-vencido" title="${titulo}"><i class="bi bi-exclamation-octagon-fill"></i>${texto}</span>`;
  }
  if (p.estado_caducidad === "por_vencer") {
    const texto = dias === 0 ? "Vence hoy" : dias === 1 ? "Vence mañana" : `Vence en ${dias} días`;
    return html`<span class="chip chip-por_vencer" title="${titulo}"><i class="bi bi-hourglass-split"></i>${texto}</span>`;
  }
  return html`<span class="chip chip-vigente" title="Fecha de caducidad"><i class="bi bi-calendar-check"></i>${titulo}</span>`;
}

export const vacio = (icono, titulo, texto, accion = "") =>
  html`<div class="vacio"><i class="bi bi-${icono}"></i><h2>${titulo}</h2><p class="mb-3">${texto}</p>${accion}</div>`;
