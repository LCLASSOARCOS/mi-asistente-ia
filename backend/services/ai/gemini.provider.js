import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/env.js";

const MODELO = "gemini-2.5-flash";

let cliente;

function obtenerCliente() {
  if (!cliente) {
    cliente = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  return cliente;
}

export const geminiProvider = {
  id: "gemini",
  nombre: "Gemini",
  modelo: MODELO,

  // Capacidades propias del proveedor. Ojo: esto describe lo que
  // el proveedor trae de fabrica, no las herramientas del asistente.
  // La busqueda web propia (Fase 7) sera una herramienta nuestra.
  capacidades: { busquedaWeb: true },

  disponible() {
    return Boolean(config.geminiApiKey);
  },

  motivoNoDisponible: "Falta configurar GEMINI_API_KEY en el archivo .env.",

  async generar({ system, messages }) {
    const response = await obtenerCliente().models.generateContent({
      model: MODELO,
      contents: messages.map((mensaje) => ({
        role: mensaje.rol === "asistente" ? "model" : "user",
        parts: [{ text: mensaje.texto }],
      })),
      config: {
        systemInstruction: system,
        tools: [{ googleSearch: {} }],
      },
    });

    const fuentesWeb = [];
    const chunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    for (const chunk of chunks) {
      if (chunk.web?.uri) {
        fuentesWeb.push({
          titulo: chunk.web.title || "Fuente web",
          url: chunk.web.uri,
        });
      }
    }

    return {
      texto: response.text,
      fuentesWeb,
    };
  },
};
