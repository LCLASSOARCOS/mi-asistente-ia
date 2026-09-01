import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config/env.js";

const MODELO = "claude-sonnet-5";
const MAX_TOKENS = 4096;

let cliente;

function obtenerCliente() {
  if (!cliente) cliente = new Anthropic({ apiKey: config.anthropicApiKey });
  return cliente;
}

function aMensajes(messages) {
  return messages.map((mensaje) => {
    if (mensaje.rol === "herramienta") {
      // Los resultados de herramienta viajan como turno del usuario:
      // asi lo exige la API de Anthropic.
      return {
        role: "user",
        content: mensaje.resultados.map((resultado) => ({
          type: "tool_result",
          tool_use_id: resultado.id,
          content: resultado.contenido,
          ...(resultado.error ? { is_error: true } : {}),
        })),
      };
    }

    if (mensaje.rol === "asistente") {
      const content = [];

      if (mensaje.texto) content.push({ type: "text", text: mensaje.texto });

      for (const llamada of mensaje.llamadas || []) {
        content.push({
          type: "tool_use",
          id: llamada.id,
          name: llamada.nombre,
          input: llamada.argumentos,
        });
      }

      return { role: "assistant", content };
    }

    return { role: "user", content: mensaje.texto };
  });
}

export const claudeProvider = {
  id: "claude",
  nombre: "Claude",
  modelo: MODELO,

  capacidades: { herramientas: true },

  disponible() {
    return Boolean(config.anthropicApiKey);
  },

  motivoNoDisponible: "Falta configurar ANTHROPIC_API_KEY en el archivo .env.",

  async generar({ system, messages, herramientas = [] }) {
    const peticion = {
      model: MODELO,
      max_tokens: MAX_TOKENS,
      system,
      messages: aMensajes(messages),
    };

    if (herramientas.length > 0) {
      peticion.tools = herramientas.map((herramienta) => ({
        name: herramienta.nombre,
        description: herramienta.descripcion,
        input_schema: herramienta.parametros,
      }));
    }

    const respuesta = await obtenerCliente().messages.create(peticion);

    let texto = "";
    const llamadas = [];

    for (const bloque of respuesta.content) {
      if (bloque.type === "text") texto += bloque.text;

      if (bloque.type === "tool_use") {
        llamadas.push({
          id: bloque.id,
          nombre: bloque.name,
          argumentos: bloque.input || {},
        });
      }
    }

    return { texto, llamadas };
  },
};
