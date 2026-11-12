// Cliente de la API. Todas las peticiones envían la cookie de sesión (credentials: "include") y devuelven JSON o lanzan un ApiError.
import { API_URL } from "./config.js";

// Error lanzado por api.js cuando la respuesta no es 2xx. Tiene status, mensaje y detalles (array de { campo, mensaje }).
export class ApiError extends Error {
  constructor(status, mensaje, detalles = []) {
    super(mensaje);
    this.name = "ApiError";
    this.status = status;
    this.detalles = detalles; // [{ campo, mensaje }]
  }
}

// Convierte un objeto { campo, valor } en query string (para GET).
function aQuery(query) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== "" && v !== false) p.set(k, String(v));
  }
  const texto = p.toString();
  return texto ? `?${texto}` : "";
}

// Hace la petición y devuelve el JSON o lanza ApiError.
async function pedir(metodo, ruta, { cuerpo, query } = {}) {
  const opciones = { method: metodo, credentials: "include", headers: {} };
  if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}${aQuery(query)}`, opciones);
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. Revisa que esté encendido (npm run dev).");
  }

  let datos = null;
  try { datos = await respuesta.json(); } catch { /* respuesta sin cuerpo JSON */ }

  if (!respuesta.ok) {
    // Sesión vencida o inexistente (el login responde 401 por credenciales, eso no cuenta).
    if (respuesta.status === 401 && ruta !== "/auth/login") {
      window.dispatchEvent(new CustomEvent("sesion-expirada"));
    }
    throw new ApiError(respuesta.status, (datos && datos.error) || "Ocurrió un error inesperado", (datos && datos.detalles) || []);
  }
  return datos;
}

// Cliente de la API con métodos get, post, put, patch y del. Cada uno devuelve una promesa que resuelve con el JSON o lanza ApiError.
export const api = {
  get: (ruta, query) => pedir("GET", ruta, { query }),
  post: (ruta, cuerpo = {}) => pedir("POST", ruta, { cuerpo }),
  put: (ruta, cuerpo) => pedir("PUT", ruta, { cuerpo }),
  patch: (ruta) => pedir("PATCH", ruta),
  del: (ruta) => pedir("DELETE", ruta),
};
