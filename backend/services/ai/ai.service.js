import { claudeProvider } from "./claude.provider.js";
import { geminiProvider } from "./gemini.provider.js";

/**
 * REGISTRO DE PROVEEDORES
 *
 * Antes esto era un switch. Un registro permite preguntarle al
 * sistema que proveedores existen y cuales estan disponibles, que
 * es justo lo que necesitaran el modo AUTO (Fase 8) y el
 * orquestador (Fase 6). Agregar OpenAI sera anadir una linea.
 */
const proveedores = new Map(
  [geminiProvider, claudeProvider].map((proveedor) => [
    proveedor.id,
    proveedor,
  ])
);

export const MODELO_POR_DEFECTO = "gemini";

export function listarProveedores() {
  return [...proveedores.values()].map((proveedor) => ({
    id: proveedor.id,
    nombre: proveedor.nombre,
    modelo: proveedor.modelo,
    capacidades: proveedor.capacidades,
    disponible: proveedor.disponible(),
  }));
}

export function obtenerProveedor(modelo = MODELO_POR_DEFECTO) {
  const proveedor = proveedores.get(modelo);

  if (!proveedor) {
    const conocidos = [...proveedores.keys()].join(", ");
    throw new Error(
      `Modelo de IA no soportado: "${modelo}". Disponibles: ${conocidos}.`
    );
  }

  return proveedor;
}

/**
 * Punto unico de entrada al sistema de IA.
 *
 * Contrato: recibe un system prompt y una lista de mensajes
 * estructurados, nunca un unico string. Cada proveedor traduce ese
 * formato al suyo. Manana este mismo contrato llevara `tools`.
 */
export async function generarRespuesta({
  modelo = MODELO_POR_DEFECTO,
  system = "",
  messages = [],
}) {
  const proveedor = obtenerProveedor(modelo);

  if (!proveedor.disponible()) {
    throw new Error(proveedor.motivoNoDisponible);
  }

  if (messages.length === 0) {
    throw new Error("No hay mensajes que enviar al modelo.");
  }

  return proveedor.generar({ system, messages });
}
