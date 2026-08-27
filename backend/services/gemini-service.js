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

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
Mantén el contexto de la conversación y responde teniendo en cuenta
los mensajes anteriores.

Conversación:

${conversacion.join("\n\n")}

${contextoDocumental}

Responde a la última pregunta del usuario de forma clara y útil.
Cuando uses información de los documentos, indica el nombre del documento entre corchetes.
`,
  });

  return { respuesta: response.text, fuentes };
}
