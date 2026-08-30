import { config } from "../config/env.js";
import { buscarFragmentosRelevantes } from "./documentos-service.js";
import { generarRespuesta } from "./ai/ai.service.js";

export async function responderPregunta(
  pregunta,
  historial = [],
  usarDocumentos = false,
  modelo = "gemini"
) {
  if (!config.geminiApiKey && modelo === "gemini") {
    throw new Error("Falta configurar GEMINI_API_KEY en el archivo .env.");
  }

  if (!config.anthropicApiKey && modelo === "claude") {
    throw new Error(
      "Falta configurar ANTHROPIC_API_KEY en el archivo .env."
    );
  }

  const conversacion = historial.map((mensaje) => {
    const rol = mensaje.tipo === "usuario" ? "Usuario" : "Asistente";

    return `${rol}: ${mensaje.texto}`;
  });

  conversacion.push(`Usuario: ${pregunta}`);

  const fragmentos = usarDocumentos
    ? await buscarFragmentosRelevantes(pregunta)
    : [];

  const fuentes = [
    ...new Set(fragmentos.map((fragmento) => fragmento.nombre)),
  ];

  const contextoDocumental =
    fragmentos.length > 0
      ? `
Documentos relevantes:

${fragmentos
  .map(
    (fragmento) =>
      `[Fuente: ${fragmento.nombre}]
${fragmento.fragmento}`
  )
  .join("\n\n")}
`
      : "";

  const prompt = `
Mantén el contexto de la conversación y responde teniendo en cuenta
los mensajes anteriores.

Conversación:

${conversacion.join("\n\n")}

${contextoDocumental}

Responde a la última pregunta del usuario de forma clara y útil.

Cuando utilices información proveniente de los documentos,
indica el nombre del documento entre corchetes.
`;

  const response = await generarRespuesta({
    modelo,
    prompt,
  });

  return {
    respuesta: response.texto,
    fuentes,
    fuentesWeb: response.fuentesWeb || [],
  };
}