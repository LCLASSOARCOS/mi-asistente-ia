import { documentosTool } from "./documentos.tool.js";
import { webTool } from "./web.tool.js";

/**
 * CATALOGO DE HERRAMIENTAS
 *
 * Una herramienta no sabe que modelo la llamo. Declara su contrato
 * (nombre, descripcion, parametros como JSON Schema) y cada
 * proveedor lo traduce a su formato.
 */
const catalogo = new Map(
  [documentosTool, webTool].map((herramienta) => [herramienta.nombre, herramienta])
);

/**
 * Devuelve las herramientas que el modelo puede ver en esta peticion.
 *
 * Los permisos los da el usuario, no el modelo. Una herramienta sin
 * permiso no se filtra despues: no se le ofrece siquiera, asi que no
 * puede pedirla. Es la diferencia entre pedir perdon y pedir permiso.
 */
export function listarHerramientas(permisos = {}) {
  return [...catalogo.values()].filter((herramienta) => {
    if (!herramienta.disponible()) return false;
    if (!herramienta.requierePermiso) return true;
    return Boolean(permisos[herramienta.requierePermiso]);
  });
}

export function obtenerHerramienta(nombre) {
  return catalogo.get(nombre) || null;
}
