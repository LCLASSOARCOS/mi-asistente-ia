import { construirPrompt } from "../prompts/assistant.prompt.js";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config/env.js";
import { buscarFragmentosRelevantes } from "./documentos-service.js";

const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

export async function responderPregunta(pregunta, historial = [], usarDocumentos = false) {
  if (!config.geminiApiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en el archivo .env.");
  }

  const conversacion = historial.map((mensaje) => {
    const rol = mensaje.tipo === "usuario" ? "Usuario" : "Asistente";
    return `${rol}: ${mensaje.texto}`;
  });

  conversacion.push(`Usuario: ${pregunta}`);
  const fragmentos = usarDocumentos ? await buscarFragmentosRelevantes(pregunta) : [];
  const fuentes = [...new Set(fragmentos.map((fragmento) => fragmento.nombre))];
  const contextoDocumental =
    fragmentos.length > 0
      ? `\nDocumentos relevantes (úsalos solo si ayudan a responder):\n${fragmentos
          .map((fragmento) => `[Fuente: ${fragmento.nombre}]\n${fragmento.fragmento}`)
          .join("\n\n")}`
      : "";

  const prompt = construirPrompt({
  conversacion,
  contextoDocumental,
});

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
});

  return { respuesta: response.text, fuentes };
}
