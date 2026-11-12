import { html, raw } from "../utils.js";

// Pie de una lista: "Mostrando 1–10 de 34" y botones de página.
export function pie(pag) {
  const { pagina, limite, total, paginas } = pag;
  const desde = total === 0 ? 0 : (pagina - 1) * limite + 1;
  const hasta = Math.min(total, pagina * limite);

  const numeros = [];
  const ini = Math.max(1, Math.min(pagina - 2, paginas - 4));
  const fin = Math.min(paginas, ini + 4);
  for (let n = ini; n <= fin; n++) numeros.push(n);

  // Dibuja el pie de lista con el rango de elementos y los botones de página. Si hay una sola página, no muestra los botones.
  return html`<div class="pie-lista">
    <span class="sub">Mostrando ${desde}–${hasta} de ${total}</span>
    ${paginas > 1 ? html`<nav aria-label="Páginas"><ul class="pagination pagination-sm">
      <li class="page-item ${pagina === 1 ? "disabled" : ""}"><button class="page-link" data-pagina="${pagina - 1}" aria-label="Página anterior"><i class="bi bi-chevron-left"></i></button></li>
      ${numeros.map((n) => html`<li class="page-item ${n === pagina ? "active" : ""}"><button class="page-link" data-pagina="${n}" ${n === pagina ? raw('aria-current="page"') : ""}>${n}</button></li>`)}
      <li class="page-item ${pagina === paginas ? "disabled" : ""}"><button class="page-link" data-pagina="${pagina + 1}" aria-label="Página siguiente"><i class="bi bi-chevron-right"></i></button></li>
    </ul></nav>` : ""}
  </div>`;
}

// Conecta los botones de página: llama a alCambiar(numero).
export function enlazar(contenedor, alCambiar) {
  contenedor.querySelectorAll("[data-pagina]").forEach((b) =>
    b.addEventListener("click", () => {
      const n = Number(b.dataset.pagina);
      if (n >= 1) alCambiar(n);
    })
  );
}
