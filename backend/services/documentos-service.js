import { mkdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config/env.js";

/**
 * BIBLIOTECA DOCUMENTAL
 *
 * Antes, cada pregunta con documentos activados volvia a abrir todos
 * los PDF, extraia su texto y lo re-fragmentaba desde cero. Eso es
 * trabajo pesado repetido en cada consulta.
 *
 * Ahora ese trabajo se hace UNA vez, al subir el documento, y se
 * guarda en data/indice/<id>.json. Buscar pasa a ser leer JSON.
 *
 * Ese indice persistente es tambien donde viviran manana los
 * embeddings (Fase 5): la busqueda cambiara, la estructura no.
 */

// Anclamos las rutas al proyecto, no al directorio desde el que se
// arranco el servidor. path.resolve("data") dependia del cwd y se
// rompia si arrancabas node desde otra carpeta.
const raizProyecto = fileURLToPath(new URL("../../", import.meta.url));
const dataDirectory = path.join(raizProyecto, "data");

export const documentosDirectory = path.join(dataDirectory, "documentos");
const indiceDirectory = path.join(dataDirectory, "indice");
const catalogoPath = path.join(dataDirectory, "documentos.json");

// Parametros de fragmentacion. Si los cambias, reindexa:
// POST /api/documentos/reindexar
const FRAGMENTO_TAMANO = 900;
const FRAGMENTO_SOLAPAMIENTO = 150;
const VERSION_INDICE = 2;

// Multer escribe el archivo antes de que corra nuestro codigo,
// asi que la carpeta debe existir desde el arranque del servidor.
mkdirSync(documentosDirectory, { recursive: true });
mkdirSync(indiceDirectory, { recursive: true });

async function prepararBiblioteca() {
  await mkdir(documentosDirectory, { recursive: true });
  await mkdir(indiceDirectory, { recursive: true });
}

async function leerCatalogo() {
  try {
    const contenido = await readFile(catalogoPath, "utf8");
    const documentos = JSON.parse(contenido);
    return Array.isArray(documentos) ? documentos : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function escribirCatalogo(documentos) {
  await writeFile(catalogoPath, JSON.stringify(documentos, null, 2));
}

export async function listarDocumentos() {
  await prepararBiblioteca();
  return leerCatalogo();
}

export async function listarDocumentosPublicos() {
  const documentos = await listarDocumentos();
  return documentos.map(({ archivoGuardado, ...documento }) => documento);
}

// ---------------------------------------------------------------
// Extraccion y fragmentacion
// ---------------------------------------------------------------

async function extraerTexto(documento) {
  if (!documento.archivoGuardado) return "";

  const ruta = path.join(documentosDirectory, documento.archivoGuardado);
  const extension = path.extname(documento.archivoGuardado).toLowerCase();

  if (extension !== ".pdf") {
    return readFile(ruta, "utf8");
  }

  // Import dinamico: pdf-parse arrastra dependencias nativas pesadas.
  // Solo lo cargamos si de verdad hay un PDF que leer.
  const { PDFParse } = await import("pdf-parse");
  const datos = await readFile(ruta);
  const parser = new PDFParse({ data: datos });

  try {
    const resultado = await parser.getText();
    return resultado.text;
  } finally {
    await parser.destroy();
  }
}

function crearFragmentos(texto) {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (!limpio) return [];

  const fragmentos = [];
  const paso = FRAGMENTO_TAMANO - FRAGMENTO_SOLAPAMIENTO;

  for (let inicio = 0; inicio < limpio.length; inicio += paso) {
    fragmentos.push({
      indice: fragmentos.length,
      inicio,
      texto: limpio.slice(inicio, inicio + FRAGMENTO_TAMANO),
    });
  }

  return fragmentos;
}

function palabrasClave(texto) {
  return (
    texto
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9]{3,}/g) || []
  );
}

// ---------------------------------------------------------------
// Indice persistente
// ---------------------------------------------------------------

function rutaIndice(documentoId) {
  return path.join(indiceDirectory, `${documentoId}.json`);
}

export async function indexarDocumento(documento) {
  await prepararBiblioteca();

  const texto = await extraerTexto(documento);
  const fragmentos = crearFragmentos(texto);

  // Guardamos el texto limpio completo ademas de los fragmentos.
  // Los fragmentos se solapan 150 caracteres, asi que concatenarlos
  // NO reconstruye el original: duplicaria cada costura.
  const limpio = texto.replace(/\s+/g, " ").trim();

  const indice = {
    version: VERSION_INDICE,
    documentoId: documento.id,
    nombre: documento.nombre,
    indexadoEn: new Date().toISOString(),
    caracteres: limpio.length,
    texto: limpio,
    fragmentos,
  };

  await writeFile(rutaIndice(documento.id), JSON.stringify(indice));

  return indice;
}

/**
 * Devuelve el indice de un documento.
 * Si no existe o quedo obsoleto, lo construye al vuelo. Asi los
 * documentos que subiste antes de este cambio siguen funcionando
 * sin que tengas que volver a cargarlos.
 */
async function obtenerIndice(documento) {
  try {
    const contenido = await readFile(rutaIndice(documento.id), "utf8");
    const indice = JSON.parse(contenido);

    if (indice.version === VERSION_INDICE) return indice;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return indexarDocumento(documento);
}

async function marcarEstado(documentoId, cambios) {
  const documentos = await leerCatalogo();
  const documento = documentos.find((item) => item.id === documentoId);
  if (!documento) return;

  Object.assign(documento, cambios);
  await escribirCatalogo(documentos);
}

export async function guardarDocumento(archivo) {
  await prepararBiblioteca();

  const documento = {
    id: crypto.randomUUID(),
    nombre: archivo.originalname,
    tipo: path.extname(archivo.originalname).slice(1).toUpperCase(),
    tamano: archivo.size,
    subidoEn: new Date().toISOString(),
    estado: "indexando",
    archivoGuardado: archivo.filename,
  };

  const documentos = await leerCatalogo();
  documentos.unshift(documento);
  await escribirCatalogo(documentos);

  // El coste se paga aqui, una sola vez, y no en cada pregunta.
  try {
    const indice = await indexarDocumento(documento);

    Object.assign(documento, {
      estado: "indexado",
      fragmentos: indice.fragmentos.length,
      caracteres: indice.caracteres,
    });
  } catch (error) {
    console.error(`No pude indexar ${documento.nombre}:`, error.message);
    Object.assign(documento, { estado: "error", error: error.message });
  }

  await marcarEstado(documento.id, documento);

  const { archivoGuardado, ...documentoPublico } = documento;
  return documentoPublico;
}

export async function reindexarBiblioteca() {
  const documentos = await listarDocumentos();
  const resultado = [];

  for (const documento of documentos) {
    try {
      const indice = await indexarDocumento(documento);

      Object.assign(documento, {
        estado: "indexado",
        fragmentos: indice.fragmentos.length,
        caracteres: indice.caracteres,
        error: undefined,
      });

      resultado.push({
        nombre: documento.nombre,
        fragmentos: indice.fragmentos.length,
      });
    } catch (error) {
      Object.assign(documento, { estado: "error", error: error.message });
      resultado.push({ nombre: documento.nombre, error: error.message });
    }
  }

  await escribirCatalogo(documentos);
  return resultado;
}

// ---------------------------------------------------------------
// Busqueda
// ---------------------------------------------------------------

/**
 * Puntuacion con IDF.
 *
 * Antes el puntaje era "cuantos terminos de la pregunta aparecen".
 * Con eso, una palabra comun como "plan" pesaba igual que un termino
 * raro y especifico. IDF (frecuencia inversa de documento) hace lo
 * contrario: cuanto en mas fragmentos aparece un termino, menos
 * informa, y menos pesa.
 */
function calcularIdf(terminos, fragmentos) {
  const total = fragmentos.length || 1;
  const idf = new Map();

  for (const termino of terminos) {
    let df = 0;

    for (const fragmento of fragmentos) {
      if (fragmento.palabras.has(termino)) df += 1;
    }

    idf.set(termino, Math.log(1 + total / (1 + df)));
  }

  return idf;
}

export async function buscarFragmentosRelevantes(pregunta, limite = 6) {
  const terminos = [...new Set(palabrasClave(pregunta))];
  if (terminos.length === 0) return [];

  const documentos = await listarDocumentos();
  const candidatos = [];

  for (const documento of documentos) {
    try {
      const indice = await obtenerIndice(documento);

      for (const fragmento of indice.fragmentos) {
        candidatos.push({
          nombre: documento.nombre,
          documentoId: documento.id,
          indice: fragmento.indice,
          fragmento: fragmento.texto,
          palabras: new Set(palabrasClave(fragmento.texto)),
        });
      }
    } catch (error) {
      console.warn(`No pude leer el documento ${documento.nombre}:`, error.message);
    }
  }

  if (candidatos.length === 0) return [];

  const idf = calcularIdf(terminos, candidatos);

  const puntuados = candidatos
    .map((candidato) => {
      let puntaje = 0;

      for (const termino of terminos) {
        if (candidato.palabras.has(termino)) puntaje += idf.get(termino);
      }

      return { ...candidato, puntaje };
    })
    .filter((candidato) => candidato.puntaje > 0);

  return puntuados
    .sort((a, b) => b.puntaje - a.puntaje || a.indice - b.indice)
    .slice(0, limite)
    .map(({ nombre, fragmento, indice, puntaje }) => ({
      nombre,
      fragmento,
      indice,
      puntaje: Number(puntaje.toFixed(3)),
    }));
}

// ---------------------------------------------------------------
// Recuperacion adaptativa
// ---------------------------------------------------------------

/**
 * Decide CUANTO documento mandarle al modelo, no solo cual.
 *
 * RAG no es una mejora: es un mal necesario cuando el documento no
 * cabe. Trocear un documento que cabia entero pierde informacion a
 * cambio de nada. Asi que primero preguntamos cuanto pesa la
 * biblioteca y solo fragmentamos si hace falta.
 *
 *   cabe entera        -> modo "completo"
 *   cabe en parte      -> modo "mixto"      (los mas relevantes enteros)
 *   no cabe casi nada  -> modo "fragmentos" (los mejores trozos)
 */
export async function recuperarContexto(pregunta, opciones = {}) {
  const presupuesto = opciones.presupuesto ?? config.presupuestoDocumental;
  const vacio = { modo: "vacio", caracteres: 0, presupuesto, piezas: [] };

  const documentos = await listarDocumentos();
  if (documentos.length === 0) return vacio;

  const cargados = [];

  for (const documento of documentos) {
    try {
      cargados.push({ documento, indice: await obtenerIndice(documento) });
    } catch (error) {
      console.warn(`No pude leer el documento ${documento.nombre}:`, error.message);
    }
  }

  if (cargados.length === 0) return vacio;

  const total = cargados.reduce((suma, { indice }) => suma + indice.caracteres, 0);

  // --- Caso 1: la biblioteca entera cabe. Nada que descartar. ---
  if (total <= presupuesto) {
    return {
      modo: "completo",
      caracteres: total,
      presupuesto,
      omitidos: [],
      piezas: cargados.map(({ documento, indice }) => ({
        documentoId: documento.id,
        nombre: documento.nombre,
        tipo: "documento",
        texto: indice.texto,
        fragmentos: indice.fragmentos.length,
        deFragmentos: indice.fragmentos.length,
      })),
    };
  }

  // --- Caso 2: hay que elegir. Puntuamos fragmentos con IDF y
  // agregamos por documento para saber cuales priorizar enteros. ---
  const terminos = [...new Set(palabrasClave(pregunta))];

  const candidatos = cargados.flatMap(({ documento, indice }) =>
    indice.fragmentos.map((fragmento) => ({
      documentoId: documento.id,
      nombre: documento.nombre,
      indice: fragmento.indice,
      texto: fragmento.texto,
      palabras: new Set(palabrasClave(fragmento.texto)),
    }))
  );

  const idf = calcularIdf(terminos, candidatos);

  for (const candidato of candidatos) {
    candidato.puntaje = terminos.reduce(
      (suma, termino) =>
        candidato.palabras.has(termino) ? suma + idf.get(termino) : suma,
      0
    );
  }

  const puntajePorDocumento = new Map();

  for (const candidato of candidatos) {
    puntajePorDocumento.set(
      candidato.documentoId,
      (puntajePorDocumento.get(candidato.documentoId) || 0) + candidato.puntaje
    );
  }

  const ordenados = [...cargados].sort(
    (a, b) =>
      (puntajePorDocumento.get(b.documento.id) || 0) -
      (puntajePorDocumento.get(a.documento.id) || 0)
  );

  const piezas = [];
  const enteros = new Set();
  let restante = presupuesto;

  // Primero, los documentos mas relevantes que quepan enteros.
  for (const { documento, indice } of ordenados) {
    if (indice.caracteres > restante) continue;

    piezas.push({
      documentoId: documento.id,
      nombre: documento.nombre,
      tipo: "documento",
      texto: indice.texto,
      fragmentos: indice.fragmentos.length,
      deFragmentos: indice.fragmentos.length,
    });

    enteros.add(documento.id);
    restante -= indice.caracteres;
  }

  // Con lo que sobre, los mejores fragmentos de los que no entraron.
  const sueltos = candidatos
    .filter((candidato) => !enteros.has(candidato.documentoId) && candidato.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || a.indice - b.indice);

  const porDocumento = new Map();

  for (const fragmento of sueltos) {
    if (fragmento.texto.length > restante) continue;

    if (!porDocumento.has(fragmento.documentoId)) {
      porDocumento.set(fragmento.documentoId, []);
    }

    porDocumento.get(fragmento.documentoId).push(fragmento);
    restante -= fragmento.texto.length;
  }

  for (const [documentoId, fragmentos] of porDocumento) {
    const { indice } = cargados.find(({ documento }) => documento.id === documentoId);

    const enOrden = [...fragmentos].sort((a, b) => a.indice - b.indice);

    piezas.push({
      documentoId,
      nombre: enOrden[0].nombre,
      tipo: "fragmentos",
      texto: enOrden.map((fragmento) => fragmento.texto).join("\n[…]\n"),
      fragmentos: enOrden.length,
      deFragmentos: indice.fragmentos.length,
    });
  }

  const hayEnteros = piezas.some((pieza) => pieza.tipo === "documento");
  const hayTrozos = piezas.some((pieza) => pieza.tipo === "fragmentos");

  // Un documento puede no entrar NI ENTERO NI EN TROZOS. Decir
  // "modo completo" en ese caso seria mentir por omision: ni el
  // usuario ni el modelo sabrian que falta media biblioteca.
  const incluidos = new Set(piezas.map((pieza) => pieza.documentoId));

  const omitidos = cargados
    .filter(({ documento }) => !incluidos.has(documento.id))
    .map(({ documento, indice }) => ({
      nombre: documento.nombre,
      caracteres: indice.caracteres,
      fragmentos: indice.fragmentos.length,
    }));

  // Si no entro absolutamente nada (presupuesto mas pequeno que un
  // fragmento) hay que decirlo, no devolver un contexto vacio que
  // el usuario confundiria con "el modelo si leyo mis documentos".
  const modo = piezas.length === 0
    ? "insuficiente"
    : hayEnteros && hayTrozos
      ? "mixto"
      : hayEnteros
        ? "completo"
        : "fragmentos";

  return {
    modo,
    caracteres: piezas.reduce((suma, pieza) => suma + pieza.texto.length, 0),
    presupuesto,
    omitidos,
    piezas,
  };
}
