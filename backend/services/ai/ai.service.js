import { generarConGemini } from "./gemini.provider.js";
import { generarConClaude } from "./claude.provider.js";

export async function generarRespuesta({
  modelo = "gemini",
  prompt,
}) {
  switch (modelo) {
    case "gemini":
      return generarConGemini(prompt);

    case "claude":
      return generarConClaude(prompt);

    default:
      throw new Error(`Modelo de IA no soportado: ${modelo}`);
  }
}