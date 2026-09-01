import { Router } from "express";
import { MODELO_POR_DEFECTO } from "../services/ai/ai.service.js";
import { responderPregunta } from "../services/ai-chat.service.js";

export const chatRouter = Router();

chatRouter.post("/preguntar", async (req, res) => {
  const {
    pregunta,
    historial = [],
    modelo = MODELO_POR_DEFECTO,
    // Permisos que concede el usuario. Se acepta tambien el
    // usarDocumentos antiguo para no romper clientes ya escritos.
    permisos,
    usarDocumentos = false,
  } = req.body;

  const permisosEfectivos = permisos || { documentos: usarDocumentos, web: true };

  if (!pregunta?.trim()) {
    return res.status(400).json({
      error: "Debes enviar una pregunta.",
    });
  }

  try {
    const resultado = await responderPregunta(
      pregunta,
      historial,
      permisosEfectivos,
      modelo
    );

    return res.json({ pregunta, ...resultado });
  } catch (error) {
    console.error("ERROR COMPLETO:", error);

    return res.status(500).json({
      error: error.message || "Error desconocido.",
      // La bitacora de intentos viaja tambien en el fallo: es
      // justo cuando mas falta hace saber que se probo.
      intentos: error.intentos || [],
    });
  }
});
