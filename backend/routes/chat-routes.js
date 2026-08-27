import { Router } from "express";
import { responderPregunta } from "../services/gemini-service.js";

export const chatRouter = Router();

chatRouter.post("/preguntar", async (req, res) => {
  const { pregunta, historial = [], usarDocumentos = false } = req.body;

  if (!pregunta?.trim()) {
    return res.status(400).json({
      error: "Debes enviar una pregunta.",
    });
  }

  try {
    const { respuesta, fuentes } = await responderPregunta(pregunta, historial, usarDocumentos);

    return res.json({
      pregunta,
      respuesta,
      fuentes,
    });
  } catch (error) {
    console.error("Error al consultar Gemini:", error);

    return res.status(500).json({
      error: "No pude consultar la IA. Revisa la configuración e inténtalo de nuevo.",
    });
  }
});
