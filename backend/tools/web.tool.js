import { config } from "../config/env.js";
import { buscarConGemini } from "../services/ai/gemini.provider.js";

/**
 * BUSQUEDA WEB COMO HERRAMIENTA DEL SISTEMA
 *
 * Antes la web vivia dentro del provider de Gemini: era una
 * capacidad SUYA, y Claude simplemente no tenia internet.
 *
 * Al subirla a herramienta, la capacidad pasa a ser del asistente y
 * cualquier modelo puede usarla. Ese es el principio "modelo ≠
 * herramienta" hecho codigo.
 *
 * Por debajo todavia la implementa Gemini con googleSearch. Cuando
 * conectemos un buscador propio (Fase 7) cambiara esta funcion y
 * nada mas: el contrato ya no se mueve.
 */
export const webTool = {
  nombre: "buscar_en_web",

  descripcion:
    "Busca información actualizada en internet y devuelve un resumen con sus " +
    "fuentes. Úsala cuando la respuesta dependa de hechos que cambian o que " +
    "son posteriores a tu entrenamiento: noticias, precios, cotizaciones, " +
    "resultados, quién ocupa un cargo, normativa reciente. No la uses para " +
    "conocimiento estable ni para contenido de los documentos del usuario.",

  parametros: {
    type: "object",
    properties: {
      consulta: {
        type: "string",
        description: "Qué buscar, redactado como lo escribirías en un buscador.",
      },
    },
    required: ["consulta"],
  },

  requierePermiso: "web",

  // Si no hay clave de Gemini no hay buscador, asi que la
  // herramienta ni siquiera se le ofrece al modelo.
  disponible: () => Boolean(config.geminiApiKey),

  async ejecutar({ consulta }) {
    const { texto, fuentes } = await buscarConGemini(String(consulta || ""));

    const listado = fuentes
      .map((fuente, indice) => `[${indice + 1}] ${fuente.titulo} — ${fuente.url}`)
      .join("\n");

    return {
      contenido: listado
        ? `${texto}\n\nFuentes:\n${listado}`
        : texto || "La búsqueda no devolvió resultados.",
      datos: { fuentesWeb: fuentes },
    };
  },
};
