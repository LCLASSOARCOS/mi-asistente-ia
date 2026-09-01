import { construirSystemPrompt } from "../prompts/assistant.prompt.js";
import { generarRespuesta, MODELO_POR_DEFECTO } from "./ai/ai.service.js";
import { construirMensajes } from "./ai/mensajes.js";
import {
  formatearContextoSistema,
  obtenerContextoSistema,
} from "./contexto-sistema.service.js";
import { recuperarContexto } from "./documentos-service.js";

// Cada modo cuenta una historia distinta al modelo. Decirle si
// tiene el documento entero o solo trozos es lo que evita que
// invente totales ("el plan tiene 4 ejes") a partir de un 24% del
// texto. Un modelo no sabe lo que NO le mandaste.
const ENCABEZADOS = {
  completo: `Tienes el CONTENIDO COMPLETO de los documentos del usuario que
aparecen abajo. Puedes responder con confianza preguntas globales:
contar secciones, resumir el conjunto, comparar documentos entre si.`,

  mixto: `Abajo tienes documentos del usuario. Algunos van COMPLETOS y otros
solo en FRAGMENTOS PARCIALES: cada bloque lo indica en su cabecera.
Sobre los completos puedes hacer afirmaciones globales; sobre los
parciales, no.`,

  fragmentos: `Abajo tienes solo FRAGMENTOS PARCIALES de los documentos del
usuario, no su contenido completo. No afirmes totales, conteos ni
ausencias ("el documento no menciona X"): con fragmentos no puedes
saberlo. Si la pregunta exige ver el documento entero, dilo.`,

  insuficiente: `El usuario tiene documentos cargados, pero NINGUNO cupo en el
espacio disponible. No tienes su contenido. Dilo con claridad y no
respondas como si los hubieras leido.`,
};

function construirContextoDocumental(recuperacion) {
  if (recuperacion.modo === "vacio") return "";

  const bloques = recuperacion.piezas.map((pieza) =>
    pieza.tipo === "documento"
      ? `[${pieza.nombre}] — documento completo\n${pieza.texto}`
      : `[${pieza.nombre}] — ${pieza.fragmentos} fragmentos de ${pieza.deFragmentos} (parcial)\n${pieza.texto}`
  );

  const partes = [ENCABEZADOS[recuperacion.modo]];

  if (recuperacion.omitidos?.length > 0) {
    const nombres = recuperacion.omitidos.map((doc) => doc.nombre).join(", ");

    partes.push(`AVISO: estos documentos del usuario NO se incluyeron por
falta de espacio: ${nombres}. Si la pregunta trata sobre ellos,
dilo claramente en vez de responder con los demas.`);
  }

  if (bloques.length > 0) partes.push(bloques.join("\n\n"));

  return partes.join("\n\n");
}

// Lo que viaja de vuelta al navegador: el resumen, nunca el texto.
function resumirRecuperacion(recuperacion) {
  return {
    modo: recuperacion.modo,
    caracteres: recuperacion.caracteres,
    presupuesto: recuperacion.presupuesto,
    omitidos: recuperacion.omitidos || [],
    detalle: recuperacion.piezas.map(({ texto, ...pieza }) => pieza),
  };
}

export async function responderPregunta(
  pregunta,
  historial = [],
  usarDocumentos = false,
  modelo = MODELO_POR_DEFECTO
) {
  const recuperacion = usarDocumentos
    ? await recuperarContexto(pregunta)
    : { modo: "vacio", caracteres: 0, presupuesto: 0, piezas: [], omitidos: [] };

  const fuentes = [...new Set(recuperacion.piezas.map((pieza) => pieza.nombre))];

  const contexto = obtenerContextoSistema();

  const system = construirSystemPrompt({
    contextoSistema: formatearContextoSistema(contexto),
    contextoDocumental: construirContextoDocumental(recuperacion),
  });

  const messages = construirMensajes(historial, pregunta);

  const respuesta = await generarRespuesta({
    modelo,
    system,
    messages,
    usarDocumentos,
  });

  return {
    respuesta: respuesta.texto,
    // El modelo que respondio puede no ser el que pediste: si el
    // primero fallo, respondio un respaldo. Devolvemos los dos.
    modelo: respuesta.modelo,
    modeloSolicitado: modelo,
    intentos: respuesta.intentos,
    fuentes,
    fuentesWeb: respuesta.fuentesWeb || [],
    contexto,
    recuperacion: usarDocumentos ? resumirRecuperacion(recuperacion) : null,
  };
}
