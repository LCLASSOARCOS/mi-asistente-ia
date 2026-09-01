import { config } from "../../config/env.js";
import { claudeProvider } from "./claude.provider.js";
import {
  EXPLICACIONES,
  clasificarError,
  esTransitorio,
  permiteCambiarDeProveedor,
} from "./errores.js";
import { geminiProvider } from "./gemini.provider.js";

/**
 * REGISTRO DE PROVEEDORES Y CADENA DE RESPALDO
 *
 * Agregar OpenAI sera anadir una linea a este array.
 */
const proveedores = new Map(
  [geminiProvider, claudeProvider].map((proveedor) => [proveedor.id, proveedor])
);

// Orden en el que se prueban los proveedores cuando hay que recurrir
// a un respaldo. El elegido por el usuario siempre va primero.
const ORDEN_RESPALDO = ["gemini", "claude", "openai"];

export const MODELO_POR_DEFECTO = "gemini";
export const MODELO_AUTO = "auto";

export function listarProveedores() {
  const reales = [...proveedores.values()].map((proveedor) => ({
    id: proveedor.id,
    nombre: proveedor.nombre,
    modelo: proveedor.modelo,
    capacidades: proveedor.capacidades,
    disponible: proveedor.disponible(),
  }));

  const hayAlguno = reales.some((proveedor) => proveedor.disponible);

  // AUTO no es un proveedor: es una politica. Pero se publica junto
  // a los demas para que la interfaz no tenga que saber que existe.
  return [
    {
      id: MODELO_AUTO,
      nombre: "Automático",
      modelo: "elige el sistema",
      capacidades: {},
      automatico: true,
      disponible: hayAlguno,
    },
    ...reales,
  ];
}

export function obtenerProveedor(modelo = MODELO_POR_DEFECTO) {
  const proveedor = proveedores.get(modelo);

  if (!proveedor) {
    const conocidos = [...proveedores.keys()].join(", ");
    throw new Error(
      `Modelo de IA no soportado: "${modelo}". Disponibles: ${conocidos}.`
    );
  }

  return proveedor;
}

function disponiblesEnOrden() {
  return ORDEN_RESPALDO.map((id) => proveedores.get(id))
    .filter(Boolean)
    .filter((proveedor) => proveedor.disponible());
}

/**
 * MODO AUTO
 *
 * Antes esto enrutaba por capacidades: si la pregunta olia a tiempo
 * real, iba al proveedor que sabia buscar en la web. Ese trabajo
 * desaparecio cuando la busqueda web paso a ser una herramienta del
 * sistema: ahora TODOS los modelos pueden buscar, asi que no hay
 * nada que enrutar.
 *
 * Se borro la heuristica en vez de inventarle una tarea nueva. AUTO
 * significa hoy "elige tu y aguanta si alguno se cae": el primero
 * disponible, con la cadena de respaldo detras. Cuando los
 * proveedores vuelvan a diferenciarse en algo que importe (coste,
 * ventana de contexto, calidad medida), aqui es donde ira.
 */
export function elegirModelo() {
  return disponiblesEnOrden()[0] || null;
}

function construirCadena(modelo) {
  const omitidos = [];

  if (modelo === MODELO_AUTO) {
    const elegido = elegirModelo();
    if (!elegido) return { cadena: [], omitidos };

    return {
      cadena: [elegido, ...disponiblesEnOrden().filter((p) => p.id !== elegido.id)],
      omitidos,
    };
  }

  const solicitado = obtenerProveedor(modelo);
  const resto = disponiblesEnOrden().filter((p) => p.id !== solicitado.id);

  if (!solicitado.disponible()) {
    omitidos.push({
      modelo: solicitado.id,
      resultado: "omitido",
      motivo: solicitado.motivoNoDisponible,
    });

    return { cadena: resto, omitidos };
  }

  return { cadena: [solicitado, ...resto], omitidos };
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Un proveedor colgado bloquearia la peticion para siempre. Esto no
// cancela la llamada de fondo, pero libera al usuario.
async function conTiempoLimite(promesa, ms) {
  let temporizador;

  const limite = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => {
      const error = new Error(`Tiempo agotado tras ${ms} ms.`);
      error.status = 504;
      rechazar(error);
    }, ms);
  });

  try {
    return await Promise.race([promesa, limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Punto unico de entrada al sistema de IA.
 *
 * Devuelve, ademas de la respuesta, el registro de lo que se
 * intento. Esa bitacora es la diferencia entre "algo fallo" y saber
 * exactamente que fallo, cuando corra sin nadie mirando.
 */
export async function generarRespuesta({
  modelo = MODELO_POR_DEFECTO,
  system = "",
  messages = [],
  herramientas = [],
}) {
  if (messages.length === 0) {
    throw new Error("No hay mensajes que enviar al modelo.");
  }

  const { cadena, omitidos } = construirCadena(modelo);
  const intentos = [...omitidos];

  if (cadena.length === 0) {
    throw new Error(
      "No hay ningún proveedor de IA configurado. Revisa las API keys en el archivo .env."
    );
  }

  const secuencia = config.fallbackActivo ? cadena : [cadena[0]];
  let ultimoError = null;

  for (const proveedor of secuencia) {
    const maximo = 1 + Math.max(0, config.reintentosPorProveedor);

    for (let intento = 1; intento <= maximo; intento += 1) {
      try {
        const respuesta = await conTiempoLimite(
          proveedor.generar({ system, messages, herramientas }),
          config.tiempoLimiteMs
        );

        intentos.push({ modelo: proveedor.id, resultado: "ok", intento });

        return {
          ...respuesta,
          modelo: proveedor.id,
          modeloSolicitado: modelo,
          intentos,
        };
      } catch (error) {
        const tipo = clasificarError(error);
        ultimoError = error;

        intentos.push({
          modelo: proveedor.id,
          resultado: "error",
          intento,
          tipo,
          mensaje: error.message,
        });

        console.warn(
          `[ia] ${proveedor.id} falló (${tipo}, intento ${intento}/${maximo}): ${error.message}`
        );

        // Peticion mal formada: es un bug nuestro. Insistir con otros
        // proveedores daria el mismo error tres veces y ocultaria la causa.
        if (tipo === "peticion") {
          error.intentos = intentos;
          throw error;
        }

        const puedeReintentar = esTransitorio(tipo) && intento < maximo;

        if (puedeReintentar) {
          await esperar(400 * intento);
          continue;
        }

        if (!permiteCambiarDeProveedor(tipo)) {
          error.intentos = intentos;
          throw error;
        }

        break; // siguiente proveedor
      }
    }
  }

  // Un proveedor que fallo dos veces por reintento no debe aparecer
  // dos veces en el mensaje: al usuario le importa el proveedor, no
  // cuantas veces insistimos.
  const porProveedor = new Map();

  for (const registro of intentos) {
    if (registro.resultado === "error") porProveedor.set(registro.modelo, registro.tipo);
  }

  const resumen = [...porProveedor]
    .map(([modelo, tipo]) => `${modelo}: ${EXPLICACIONES[tipo]}`)
    .join(" · ");

  const fallo = new Error(
    `Ningún proveedor pudo responder. ${resumen || ultimoError?.message || ""}`.trim()
  );

  fallo.intentos = intentos;
  fallo.causa = ultimoError;

  throw fallo;
}
