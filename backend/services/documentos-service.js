import { mkdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const VERSION_INDICE = 1;

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

  const indice = {
    version: VERSION_INDICE,
    documentoId: documento.id,
    nombre: documento.nombre,
    indexadoEn: new Date().toISOString(),
    caracteres: texto.length,
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
