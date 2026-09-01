/**
 * CLASIFICACION DE ERRORES
 *
 * "Falló, prueba con otro" es una mala regla. Si la peticion esta
 * mal construida (un bug nuestro), reintentar con los tres
 * proveedores solo consigue tres errores identicos, tres facturas y
 * un mensaje final que oculta la causa real.
 *
 * Asi que primero preguntamos de QUE tipo de fallo se trata:
 *
 *   peticion     -> culpa nuestra. Abortar y mostrar el error.
 *   tiempo       -> tardo demasiado. Cambiar YA, sin reintentar:
 *                   volver a esperar el limite completo duplicaria
 *                   la espera del usuario para nada.
 *   credenciales -> la llave de ESE proveedor no sirve. Siguiente.
 *   cuota        -> limite alcanzado. Esperar un poco o siguiente.
 *   proveedor    -> 5xx, sobrecarga. Tipico 503 de Gemini. Reintentar.
 *   red          -> timeout o DNS. Reintentar.
 *   desconocido  -> no sabemos. Siguiente proveedor, sin insistir.
 */
export function clasificarError(error) {
  const estado =
    error?.status ?? error?.statusCode ?? error?.response?.status ?? null;

  const mensaje = String(error?.message || "");

  if (estado === 504 || /tiempo agotado/i.test(mensaje)) return "tiempo";
  if (estado === 401 || estado === 403) return "credenciales";
  if (estado === 429) return "cuota";
  if (estado === 400 || estado === 404 || estado === 422) return "peticion";
  if (typeof estado === "number" && estado >= 500) return "proveedor";

  if (/timeout|aborted?|ECONNRESET|ECONNREFUSED|ENOTFOUND|fetch failed|network/i.test(mensaje)) {
    return "red";
  }

  if (/overloaded|unavailable|503|502|504|try again/i.test(mensaje)) {
    return "proveedor";
  }

  if (/api[_ ]?key|unauthorized|permission/i.test(mensaje)) return "credenciales";
  if (/quota|rate limit|resource_exhausted/i.test(mensaje)) return "cuota";

  return "desconocido";
}

// Fallos donde insistir con el MISMO proveedor tiene sentido:
// son transitorios por definicion.
const TRANSITORIOS = new Set(["proveedor", "red"]);

// Fallos donde vale la pena probar OTRO proveedor.
const CAMBIAR_DE_PROVEEDOR = new Set([
  "tiempo",
  "credenciales",
  "cuota",
  "proveedor",
  "red",
  "desconocido",
]);

export function esTransitorio(tipo) {
  return TRANSITORIOS.has(tipo);
}

export function permiteCambiarDeProveedor(tipo) {
  return CAMBIAR_DE_PROVEEDOR.has(tipo);
}

export const EXPLICACIONES = {
  peticion: "La petición al modelo no era válida.",
  tiempo: "El proveedor tardó demasiado en responder.",
  credenciales: "La API key de este proveedor no es válida.",
  cuota: "Se alcanzó el límite de uso de este proveedor.",
  proveedor: "El proveedor no está disponible en este momento.",
  red: "No se pudo alcanzar al proveedor (red o tiempo agotado).",
  desconocido: "Fallo no identificado del proveedor.",
};
