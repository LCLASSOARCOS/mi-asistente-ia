import { config } from "../config/env.js";

/**
 * CONTEXTO DEL SISTEMA
 *
 * Un modelo de lenguaje no sabe que dia es hoy: su conocimiento
 * quedo congelado el dia que termino su entrenamiento. Gemini lo
 * disimula porque puede buscar en Google; Claude simplemente dice
 * que no lo sabe.
 *
 * Esa diferencia no deberia existir. Saber la fecha no es una
 * capacidad del modelo: es un dato que nuestro backend tiene y que
 * puede entregar. Por eso lo calculamos aqui, una sola vez, y se lo
 * damos igual a todos los proveedores.
 *
 * Este servicio es el primer ladrillo del futuro orquestador:
 * el lugar donde el sistema describe su propio estado.
 */
export function obtenerContextoSistema(ahora = new Date()) {
  const zonaHoraria = config.zonaHoraria;
  const idioma = config.idioma;

  const fecha = new Intl.DateTimeFormat(idioma, {
    dateStyle: "full",
    timeZone: zonaHoraria,
  }).format(ahora);

  // Version compacta para sitios con poco espacio (barra lateral).
  const fechaCorta = new Intl.DateTimeFormat(idioma, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: zonaHoraria,
  }).format(ahora);

  const hora = new Intl.DateTimeFormat(idioma, {
    timeStyle: "short",
    timeZone: zonaHoraria,
  }).format(ahora);

  return {
    fecha,
    fechaCorta,
    hora,
    zonaHoraria,
    idioma,
    instanteISO: ahora.toISOString(),
  };
}

/**
 * Convierte el contexto en el texto que recibe el modelo.
 * Va separado de obtenerContextoSistema() para que el mismo dato
 * pueda servir tambien a la API (/api/estado) o a la interfaz,
 * sin obligarlas a leer un bloque pensado para un modelo.
 */
export function formatearContextoSistema(contexto = obtenerContextoSistema()) {
  return `Contexto del sistema (proporcionado por el backend, no por tu entrenamiento):
- Fecha actual: ${contexto.fecha}
- Hora actual: ${contexto.hora}
- Zona horaria: ${contexto.zonaHoraria}
- Instante exacto (ISO 8601): ${contexto.instanteISO}

Este dato es autoritativo. Si tu conocimiento interno sugiere otra
fecha, esta equivocado: usa siempre la fecha de arriba y no digas
que no tienes acceso a la fecha o la hora actuales.`;
}
