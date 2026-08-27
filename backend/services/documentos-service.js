import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

export async function guardarDocumento(archivo) {
  await prepararBiblioteca();

  const documento = {
    id: crypto.randomUUID(),
    nombre: archivo.originalname,
    tipo: path.extname(archivo.originalname).slice(1).toUpperCase(),
    tamano: archivo.size,
    subidoEn: new Date().toISOString(),
  };

  const documentos = await leerIndice();
  documentos.unshift(documento);
  await writeFile(indicePath, JSON.stringify(documentos, null, 2));

  return documento;
}
