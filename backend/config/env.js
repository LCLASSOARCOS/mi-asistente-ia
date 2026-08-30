import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),

  clientOrigin:
    process.env.CLIENT_ORIGIN || "http://localhost:5173",

  geminiApiKey: process.env.GEMINI_API_KEY,

  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  openaiApiKey: process.env.OPENAI_API_KEY,

  // Contexto del sistema: el asistente usa esta zona horaria
  // para saber que dia y que hora es, sin depender del modelo.
  zonaHoraria:
    process.env.ASISTENTE_ZONA_HORARIA || "America/Bogota",

  idioma: process.env.ASISTENTE_IDIOMA || "es-CO",
};
