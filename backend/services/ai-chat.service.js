import { construirSystemPrompt } from "../prompts/assistant.prompt.js";
import { generarRespuesta, MODELO_POR_DEFECTO } from "./ai/ai.service.js";
import { construirMensajes } from "./ai/mensajes.js";
import {
  formatearContextoSistema,
  obtenerContextoSistema,
} from "./contexto-sistema.service.js";
import { buscarFragmentosRelevantes } from "./documentos-service.js";

function construirContextoDocumental(fragmentos) {
  if (fragmentos.length === 0) return "";

  const bloques = fragmentos.map(
    (fragmento) => `[${fragmento.nombre}]\n${fragmento.fragmento}`
  );

  return `Fragmentos recuperados de la biblioteca de documentos del usuario:\n\n${bloques.join(
    "\n\n"
  )}`;
}

export async function responderPregunta(
  pregunta,
  historial = [],
  usarDocumentos = false,
  modelo = MODELO_POR_DEFECTO
) {
  const fragmentos = usarDocumentos
    ? await buscarFragmentosRelevantes(pregunta)
    : [];

  const fuentes = [...new Set(fragmentos.map((fragmento) => fragmento.nombre))];

  const contexto = obtenerContextoSistema();

  const system = construirSystemPrompt({
    contextoSistema: formatearContextoSistema(contexto),
    contextoDocumental: construirContextoDocumental(fragmentos),
  });

  const messages = construirMensajes(historial, pregunta);

  const respuesta = await generarRespuesta({ modelo, system, messages });

  return {
    respuesta: respuesta.texto,
    fuentes,
    fuentesWeb: respuesta.fuentesWeb || [],
    contexto,
  };
}
