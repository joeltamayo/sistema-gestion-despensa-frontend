import { api } from "../api.js";
import { html, pintar, fechaHoraLocal, cantidadTexto, numero } from "../utils.js";
import { DIAS_POR_VENCER } from "../config.js";
import { vacio } from "../componentes/estado.js";

// Etiqueta con el número de avisos y un enlace a la vista correspondiente. Se usa en la vista de inicio.
function etiqueta({ clase, n, que, detalle, enlace }) {
  return html`<a class="etiqueta ${clase} ${n === 0 ? "cero" : ""}" href="${enlace}">
    <div class="cifra">${n}</div><div class="que">${que}</div><div class="detalle">${detalle}</div></a>`;
}

// Monta la vista de inicio en `contenedor`. Carga los datos del dashboard y muestra errores de red o de datos.
export async function montar(contenedor) {
  let datos;
  try {
    datos = await api.get("/dashboard", { dias: DIAS_POR_VENCER, ultimos: 8 });
  } catch (e) {
    pintar(contenedor, vacio("wifi-off", "No se pudo cargar el inicio", e.message));
    return;
  }
  const { resumen: r, ultimos_movimientos: movs } = datos;
  const atencion = r.vencidos + r.por_vencer + r.bajo_stock;

  // Pinta la vista de inicio con los avisos, los últimos movimientos y el resumen del inventario. Los avisos y los movimientos tienen enlaces a las vistas correspondientes.
  pintar(contenedor, html`
    <div class="cabecera">
      <div><h1>Tu despensa</h1>
        <p>${r.productos_activos === 0 ? "Aún no tienes productos registrados." : atencion === 0 ? "Todo en orden: nada vence pronto ni se está acabando." : `${atencion} ${atencion === 1 ? "aviso" : "avisos"} que revisar.`}</p></div>
      <div class="d-flex gap-2">
        <a class="btn btn-primary" href="#/productos/nuevo"><i class="bi bi-plus-lg"></i> Nuevo producto</a>
      </div>
    </div>

    <section aria-label="Avisos" class="estante mb-4">
      ${etiqueta({ clase: "t-vencido", n: r.vencidos, que: "Vencidos", detalle: "Ya pasó su fecha de caducidad", enlace: "#/productos?caducidad=vencidos" })}
      ${etiqueta({ clase: "t-poco", n: r.por_vencer, que: "Por vencer", detalle: `En los próximos ${DIAS_POR_VENCER} días`, enlace: "#/productos?caducidad=por_vencer" })}
      ${etiqueta({ clase: "t-bajo", n: r.bajo_stock, que: "Poco stock", detalle: "En o por debajo del mínimo", enlace: "#/productos?bajo_stock=true&orden=cantidad" })}
      ${etiqueta({ clase: "t-agotado", n: r.agotados, que: "Agotados", detalle: "Sin existencias", enlace: "#/productos?bajo_stock=true&orden=cantidad" })}
    </section>

    <div class="row g-3">
      <div class="col-12 col-xl-7">
        <section class="panel h-100">
          <div class="panel-cuerpo d-flex justify-content-between align-items-center">
            <h2 class="panel-titulo">Últimos movimientos</h2>
            <a href="#/movimientos" class="small">Ver todos</a>
          </div>
          ${movs.length === 0
      ? vacio("arrow-left-right", "Sin movimientos todavía", "Cuando registres entradas o salidas aparecerán aquí.")
      : html`<ul class="list-unstyled m-0">${movs.map((m) => html`
                <li class="separador d-flex align-items-center justify-content-between gap-3 px-3 py-2">
                  <div class="min-w-0">
                    <div class="fw-bold text-truncate">${m.producto}</div>
                    <div class="sub">${fechaHoraLocal(m.fecha)}${m.motivo ? html` · ${m.motivo}` : ""}</div>
                  </div>
                  <span class="chip chip-${m.tipo} flex-shrink-0">${m.tipo === "entrada" ? "+" : "−"}${cantidadTexto(m.cantidad, m.unidad)} ${m.unidad}</span>
                </li>`)}</ul>`}
        </section>
      </div>
      <div class="col-12 col-xl-5">
        <section class="panel panel-cuerpo h-100">
          <h2 class="panel-titulo mb-3">Inventario</h2>
          <div class="cifras-fila">
            <a href="#/productos"><span class="n">${numero(r.productos_activos)}</span><span class="l">Productos activos</span></a>
            <a href="#/categorias"><span class="n">${numero(r.categorias)}</span><span class="l">Categorías</span></a>
            <div><span class="n">${numero(r.sin_caducidad)}</span><span class="l">Sin fecha de caducidad</span></div>
            <a href="#/productos?estado=inactivos"><span class="n">${numero(r.productos_desactivados)}</span><span class="l">Desactivados</span></a>
            <a href="#/movimientos"><span class="n">${numero(r.movimientos_totales)}</span><span class="l">Movimientos en total</span></a>
          </div>
        </section>
      </div>
    </div>`);
}
