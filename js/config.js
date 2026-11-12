// Dirección de la API. Usa el mismo nombre de host con el que abriste el cliente (localhost) para que la cookie de sesión y CORS coincidan.
export const PUERTO_API = 3000;
export const API_URL = `${location.protocol}//${location.hostname}:${PUERTO_API}/api`;

// Valores del servidor que el cliente también necesita conocer.
export const UNIDADES = [
  { valor: "kg", nombre: "Kilogramos (kg)" },
  { valor: "g", nombre: "Gramos (g)" },
  { valor: "l", nombre: "Litros (l)" },
  { valor: "ml", nombre: "Mililitros (ml)" },
  { valor: "pza", nombre: "Piezas (pza)" },
];
export const LIMITES = [5, 10, 15, 25];
export const DIAS_POR_VENCER = 7;
