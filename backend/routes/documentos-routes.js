import crypto from "node:crypto";
import path from "node:path";
import multer from "multer";
import { Router } from "express";
import {
  documentosDirectory,
  guardarDocumento,
  listarDocumentos,
} from "../services/documentos-service.js";

const extensionesPermitidas = new Set([".pdf", ".txt", ".md"]);

const storage = multer.diskStorage({
  destination: documentosDirectory,
  filename: (req, archivo, callback) => {
    const extension = path.extname(archivo.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, archivo, callback) => {
    const extension = path.extname(archivo.originalname).toLowerCase();

    if (!extensionesPermitidas.has(extension)) {
      return callback(new Error("Solo puedes cargar archivos PDF, TXT o Markdown."));
    }

    return callback(null, true);
  },
});

export const documentosRouter = Router();

documentosRouter.get("/", async (req, res, next) => {
  try {
    const documentos = await listarDocumentos();
    res.json({ documentos });
  } catch (error) {
    next(error);
  }
});

documentosRouter.post("/", upload.single("archivo"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: "Selecciona un archivo para cargar." });
  }

  try {
    const documento = await guardarDocumento(req.file);
    return res.status(201).json({ documento });
  } catch (error) {
    return next(error);
  }
});

documentosRouter.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "El archivo no puede superar 10 MB." });
  }

  if (error.message) {
    return res.status(400).json({ error: error.message });
  }

  return next(error);
});
