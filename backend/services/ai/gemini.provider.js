import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/env.js";

const MODELO = "gemini-2.5-flash";

let cliente;

function obtenerCliente() {
  if (!cliente) cliente = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return cliente;
}

/**
 * El esquema de Gemini espera los tipos en MAYUSCULAS (OBJECT,
 * STRING...), mientras que JSON Schema los escribe en minusculas.
 * Traducimos aqui para que las herramientas puedan declararse una
 * sola vez, en JSON Schema estandar.
 */
function aEsquemaGemini(esquema) {
  if (Array.isArray(esquema)) return esquema.map(aEsquemaGemini);
  if (!esquema || typeof esquema !== "object") return esquema;

  const salida = {};

  for (const [clave, valor] of Object.entries(esquema)) {
    salida[clave] =
      clave === "type" && typeof valor === "string"
        ? valor.toUpperCase()
        : aEsquemaGemini(valor);
  }

  return salida;
}

function aContenidos(messages) {
  return messages.map((mensaje) => {
    if (mensaje.rol === "herramienta") {
      // Gemini empareja resultados por NOMBRE, no por identificador.
      return {
        role: "user",
        parts: mensaje.resultados.map((resultado) => ({
          functionResponse: {
            name: resultado.nombre,
            response: { resultado: resultado.contenido },
          },
        })),
      };
    }

    const parts = [];

    if (mensaje.texto) parts.push({ text: mensaje.texto });

    for (const llamada of mensaje.llamadas || []) {
      parts.push({
        functionCall: { name: llamada.nombre, args: llamada.argumentos },
      });
    }

    return {
      role: mensaje.rol === "asistente" ? "model" : "user",
      parts: parts.length > 0 ? parts : [{ text: "" }],
    };
  });
}

export const geminiProvider = {
  id: "gemini",
  nombre: "Gemini",
  modelo: MODELO,

  // La busqueda web ya NO es una capacidad del proveedor: es la
  // herramienta buscar_en_web, disponible para todos los modelos.
  capacidades: { herramientas: true },

  disponible() {
    return Boolean(config.geminiApiKey);
  },

  motivoNoDisponible: "Falta configurar GEMINI_API_KEY en el archivo .env.",

  async generar({ system, messages, herramientas = [] }) {
    const peticion = {
      model: MODELO,
      contents: aContenidos(messages),
      config: { systemInstruction: system },
    };

    if (herramientas.length > 0) {
      peticion.config.tools = [
        {
          functionDeclarations: herramientas.map((herramienta) => ({
            name: herramienta.nombre,
            description: herramienta.descripcion,
            parameters: aEsquemaGemini(herramienta.parametros),
          })),
        },
      ];
    }

    const respuesta = await obtenerCliente().models.generateContent(peticion);
    const partes = respuesta.candidates?.[0]?.content?.parts || [];

    let texto = "";
    const llamadas = [];

    for (const parte of partes) {
      if (parte.text) texto += parte.text;

      if (parte.functionCall) {
        llamadas.push({
          id: `${parte.functionCall.name}-${llamadas.length}`,
          nombre: parte.functionCall.name,
          argumentos: parte.functionCall.args || {},
        });
      }
    }

    return { texto: texto || respuesta.text || "", llamadas };
  },
};

/**
 * Busqueda web con el buscador integrado de Gemini.
 *
 * Vive aparte de generar() a proposito: la API de Gemini no permite
 * mezclar googleSearch con functionDeclarations en la misma
 * peticion. Y conceptualmente tampoco debe mezclarse — esto es una
 * herramienta del sistema que da la casualidad de estar implementada
 * con Gemini, no una capacidad del proveedor Gemini.
 */
export async function buscarConGemini(consulta) {
  const respuesta = await obtenerCliente().models.generateContent({
    model: MODELO,
    contents: [{ role: "user", parts: [{ text: consulta }] }],
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction:
        "Busca en internet y responde de forma breve y factual, con datos " +
        "concretos y fechas. No adornes ni des opiniones.",
    },
  });

  const fuentes = [];
  const chunks =
    respuesta.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  for (const chunk of chunks) {
    if (chunk.web?.uri) {
      fuentes.push({
        titulo: chunk.web.title || "Fuente web",
        url: chunk.web.uri,
      });
    }
  }

  return { texto: respuesta.text || "", fuentes };
}
