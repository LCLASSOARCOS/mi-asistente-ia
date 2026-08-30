import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config/env.js";

const MODELO = "claude-sonnet-5";
const MAX_TOKENS = 4096;

let cliente;

function obtenerCliente() {
  if (!cliente) {
    cliente = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  return cliente;
}

export const claudeProvider = {
  id: "claude",
  nombre: "Claude",
  modelo: MODELO,

  capacidades: { busquedaWeb: false },

  disponible() {
    return Boolean(config.anthropicApiKey);
  },

  motivoNoDisponible: "Falta configurar ANTHROPIC_API_KEY en el archivo .env.",

  async generar({ system, messages }) {
    const response = await obtenerCliente().messages.create({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      // Parametro nativo: no se mezcla con la conversacion.
      system,
      messages: messages.map((mensaje) => ({
        role: mensaje.rol === "asistente" ? "assistant" : "user",
        content: mensaje.texto,
      })),
    });

    const texto = response.content
      .filter((bloque) => bloque.type === "text")
      .map((bloque) => bloque.text)
      .join("\n");

    return {
      texto,
      fuentesWeb: [],
    };
  },
};
