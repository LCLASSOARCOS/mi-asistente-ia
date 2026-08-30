import { Router } from "express";
import { responderPregunta } from "../services/ai-chat.service.js";

export const chatRouter = Router();

chatRouter.post("/preguntar", async (req, res) => {
  const {
    pregunta,
    historial = [],
    usarDocumentos = false,
    modelo = "gemini",
  } = req.body;

  if (!pregunta?.trim()) {
    return res.status(400).json({
      error: "Debes enviar una pregunta.",
    });
  }

  try {
    const {
      respuesta,
      fuentes,
      fuentesWeb,
    } = await responderPregunta(
      pregunta,
      historial,
      usarDocumentos,
      modelo
    );

    return res.json({
      pregunta,
      respuesta,
      fuentes,
      fuentesWeb,
      modelo,
    });
  } catch (error) {
    console.error("ERROR COMPLETO:", error);

    return res.status(500).json({
      error: error.message || "Error desconocido.",
    });
  }
});