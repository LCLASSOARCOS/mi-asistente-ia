import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/env.js";

const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

export async function generarConGemini(prompt) {
  if (!config.geminiApiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [
        {
          googleSearch: {},
        },
      ],
    },
  });

  const fuentesWeb = [];

  const groundingMetadata =
    response.candidates?.[0]?.groundingMetadata;

  const chunks = groundingMetadata?.groundingChunks || [];

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
}