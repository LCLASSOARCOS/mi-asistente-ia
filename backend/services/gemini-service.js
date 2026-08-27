import { GoogleGenAI } from "@google/genai";
import { config } from "../config/env.js";

const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

export async function responderPregunta(pregunta, historial = []) {
  if (!config.geminiApiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en el archivo .env.");
  }

  const conversacion = historial.map((mensaje) => {
    const rol = mensaje.tipo === "usuario" ? "Usuario" : "Asistente";
    return `${rol}: ${mensaje.texto}`;
  });

  conversacion.push(`Usuario: ${pregunta}`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
Mantén el contexto de la conversación y responde teniendo en cuenta
los mensajes anteriores.

Conversación:

${conversacion.join("\n\n")}

Responde a la última pregunta del usuario de forma clara y útil.
`,
  });

  return response.text;
}
