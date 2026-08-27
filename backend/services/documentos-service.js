import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

const dataDirectory = path.resolve("data");
export const documentosDirectory = path.join(dataDirectory, "documentos");
const indicePath = path.join(dataDirectory, "documentos.json");

async function prepararBiblioteca() {
  await mkdir(documentosDirectory, { recursive: true });
}

async function leerIndice() {
  try {
    const contenido = await readFile(indicePath, "utf8");
    const documentos = JSON.parse(contenido);
    return Array.isArray(documentos) ? documentos : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function listarDocumentos() {
  await prepararBiblioteca();
  return leerIndice();
}

export async function listarDocumentosPublicos() {
  const documentos = await listarDocumentos();
  return documentos.map(({ archivoGuardado, ...documento }) => documento);
}

export async function guardarDocumento(archivo) {
  await prepararBiblioteca();

  const documento = {
    id: crypto.randomUUID(),
    nombre: archivo.originalname,
    tipo: path.extname(archivo.originalname).slice(1).toUpperCase(),
    tamano: archivo.size,
    subidoEn: new Date().toISOString(),
    archivoGuardado: archivo.filename,
  };

  const documentos = await leerIndice();
  documentos.unshift(documento);
  await writeFile(indicePath, JSON.stringify(documentos, null, 2));

  return documento;
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

function crearFragmentos(texto) {
  const tamano = 900;
  const solapamiento = 150;
  const limpio = texto.replace(/\s+/g, " ").trim();
  const fragmentos = [];

  for (let inicio = 0; inicio < limpio.length; inicio += tamano - solapamiento) {
    fragmentos.push(limpio.slice(inicio, inicio + tamano));
  }

  return fragmentos;
}

async function extraerTexto(documento) {
  if (!documento.archivoGuardado) return "";

  const ruta = path.join(documentosDirectory, documento.archivoGuardado);
  const extension = path.extname(documento.archivoGuardado).toLowerCase();

  if (extension === ".pdf") {
    const datos = await readFile(ruta);
    const parser = new PDFParse({ data: datos });

    try {
      const resultado = await parser.getText();
      return resultado.text;
    } finally {
      await parser.destroy();
    }
  }

  return readFile(ruta, "utf8");
}

export async function buscarFragmentosRelevantes(pregunta, limite = 4) {
  const terminos = [...new Set(palabrasClave(pregunta))];
  if (terminos.length === 0) return [];

  const documentos = await listarDocumentos();
  const candidatos = [];

  for (const documento of documentos) {
    try {
      const texto = await extraerTexto(documento);

      for (const fragmento of crearFragmentos(texto)) {
        const palabrasFragmento = new Set(palabrasClave(fragmento));
        const puntaje = terminos.filter((termino) => palabrasFragmento.has(termino)).length;

        if (puntaje > 0) {
          candidatos.push({ nombre: documento.nombre, fragmento, puntaje });
        }
      }
    } catch (error) {
      console.warn(`No pude leer el documento ${documento.nombre}:`, error.message);
    }
  }

  return candidatos
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, limite)
    .map(({ nombre, fragmento }) => ({ nombre, fragmento }));
}
