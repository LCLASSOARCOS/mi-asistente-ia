import { construirSystemPrompt } from "../prompts/assistant.prompt.js";
import { listarHerramientas } from "../tools/registro.js";
import { MODELO_POR_DEFECTO } from "./ai/ai.service.js";
import { construirMensajes } from "./ai/mensajes.js";
import {
  formatearContextoSistema,
  obtenerContextoSistema,
} from "./contexto-sistema.service.js";
import { orquestar } from "./orquestador.service.js";

/**
 * Prepara el contexto de una peticion del chat y se la pasa al
 * orquestador.
 *
 * Ya no decide NADA sobre documentos: solo traduce los permisos del
 * usuario en el catalogo de herramientas que el modelo podra ver.
 * Quien decide si hacen falta es el orquestador.
 */
export async function responderPregunta(
  pregunta,
  historial = [],
  permisos = {},
  modelo = MODELO_POR_DEFECTO
) {
  const contexto = obtenerContextoSistema();
  const herramientas = listarHerramientas(permisos);

  const system = construirSystemPrompt({
    contextoSistema: formatearContextoSistema(contexto),
    herramientas,
  });

  const messages = construirMensajes(historial, pregunta);

  const resultado = await orquestar({ modelo, system, messages, herramientas });

  return {
    respuesta: resultado.texto,
    // El modelo que respondio puede no ser el que pediste: si el
    // primero fallo, respondio un respaldo.
    modelo: resultado.modelo,
    modeloSolicitado: modelo,
    intentos: resultado.intentos,
    fuentes: resultado.fuentes,
    fuentesWeb: resultado.fuentesWeb,
    recuperacion: resultado.recuperacion,
    usoHerramientas: resultado.usoHerramientas,
    herramientasOfrecidas: herramientas.map((h) => h.nombre),
    contexto,
  };
}
