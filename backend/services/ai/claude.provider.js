import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config/env.js";

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export async function generarConClaude(prompt) {
  if (!config.anthropicApiKey) {
    throw new Error("Falta configurar ANTHROPIC_API_KEY.");
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const texto = response.content
    .filter((bloque) => bloque.type === "text")
    .map((bloque) => bloque.text)
    .join("\n");

  return {
    texto,
    fuentesWeb: [],
  };
}