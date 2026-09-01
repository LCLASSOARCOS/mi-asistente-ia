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

  // Cuanto texto documental puede acompanar como maximo a una
  // pregunta. Es el numero que decide si el asistente manda los
  // documentos enteros o solo fragmentos.
  presupuestoDocumental: Number(
    process.env.ASISTENTE_PRESUPUESTO_DOCUMENTAL || 80_000
  ),

  // Si un proveedor falla, intentar con el siguiente.
  fallbackActivo: process.env.ASISTENTE_FALLBACK !== "false",

  // Cuanto esperamos a un proveedor antes de darlo por perdido.
  tiempoLimiteMs: Number(process.env.ASISTENTE_TIEMPO_LIMITE_MS || 60_000),

  // Reintentos con el MISMO proveedor ante fallos transitorios.
  reintentosPorProveedor: Number(process.env.ASISTENTE_REINTENTOS || 1),
};
