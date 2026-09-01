import { recuperarContexto } from "../services/documentos-service.js";

/**
 * Cada modo cuenta una historia distinta al modelo. Decirle si tiene
 * el documento entero o solo trozos es lo que evita que invente
 * totales a partir de una fraccion del texto: un modelo no sabe lo
 * que NO le mandaste.
 */
const ENCABEZADOS = {
  completo: `CONTENIDO COMPLETO de los documentos. Puedes responder con
confianza preguntas globales: contar secciones, resumir el conjunto,
comparar documentos entre si.`,

  mixto: `Algunos documentos van COMPLETOS y otros solo en FRAGMENTOS
PARCIALES; cada bloque lo indica. Sobre los completos puedes hacer
afirmaciones globales; sobre los parciales, no.`,

  fragmentos: `Solo FRAGMENTOS PARCIALES, no el contenido completo. No
afirmes totales, conteos ni ausencias ("no menciona X"): con
fragmentos no puedes saberlo. Si la pregunta exige el documento
entero, dilo.`,

  insuficiente: `El usuario tiene documentos, pero ninguno cupo en el
espacio disponible. No tienes su contenido: dilo con claridad.`,

  vacio: `El usuario no tiene documentos cargados en su biblioteca.`,
};

export const documentosTool = {
  nombre: "consultar_documentos",

  descripcion:
    "Consulta la biblioteca de documentos personales del usuario (PDF, TXT, " +
    "Markdown) y devuelve su contenido relevante. Úsala cuando la pregunta " +
    "mencione sus documentos o archivos, o cuando la respuesta dependa de " +
    "información propia del usuario que no está en tu conocimiento general. " +
    "No la uses para conocimiento general ni para hechos públicos actuales.",

  parametros: {
    type: "object",
    properties: {
      consulta: {
        type: "string",
        description:
          "Palabras clave o la pregunta reformulada, en el idioma del documento. " +
          "Sé específico: se usa para puntuar qué partes son relevantes.",
      },
    },
    required: ["consulta"],
  },

  requierePermiso: "documentos",

  disponible: () => true,

  async ejecutar({ consulta }) {
    const recuperacion = await recuperarContexto(String(consulta || ""));

    const bloques = recuperacion.piezas.map((pieza) =>
      pieza.tipo === "documento"
        ? `[${pieza.nombre}] — documento completo\n${pieza.texto}`
        : `[${pieza.nombre}] — ${pieza.fragmentos} fragmentos de ${pieza.deFragmentos} (parcial)\n${pieza.texto}`
    );

    const partes = [ENCABEZADOS[recuperacion.modo] || ENCABEZADOS.vacio];

    if (recuperacion.omitidos?.length > 0) {
      const nombres = recuperacion.omitidos.map((doc) => doc.nombre).join(", ");

      partes.push(
        `AVISO: no cupieron por falta de espacio: ${nombres}. Si la ` +
          `pregunta trata sobre ellos, dilo en vez de responder con los demas.`
      );
    }

    if (bloques.length > 0) partes.push(bloques.join("\n\n"));

    return {
      contenido: partes.join("\n\n"),
      datos: {
        recuperacion: {
          modo: recuperacion.modo,
          caracteres: recuperacion.caracteres,
          presupuesto: recuperacion.presupuesto,
          omitidos: recuperacion.omitidos || [],
          detalle: recuperacion.piezas.map(({ texto, ...pieza }) => pieza),
        },
        fuentes: [...new Set(recuperacion.piezas.map((pieza) => pieza.nombre))],
      },
    };
  },
};
