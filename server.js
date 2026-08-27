import express from "express";
import cors from "cors";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("¡Mi asistente IA está funcionando!");
});

app.post("/api/preguntar", async (req, res) => {
  try {
    const pregunta = req.body.pregunta;
    const historial = req.body.historial || [];

    if (!pregunta || !pregunta.trim()) {
      return res.status(400).json({
        error: "Debes enviar una pregunta.",
      });
    }

    console.log("Pregunta recibida:", pregunta);

    const conversacion = historial.map((mensaje) => {
      const rol = mensaje.tipo === "usuario" ? "Usuario" : "Asistente";

      return `${rol}: ${mensaje.texto}`;
    });

    conversacion.push(`Usuario: ${pregunta}`);

    const prompt = `
Mantén el contexto de la conversación y responde teniendo en cuenta
los mensajes anteriores.

Conversación:

${conversacion.join("\n\n")}

Responde a la última pregunta del usuario de forma clara y útil.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      pregunta,
      respuesta: response.text,
    });
  } catch (error) {
    console.error("Error al consultar Gemini:", error);

    res.status(500).json({
      error: "Ocurrió un error al consultar la IA.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});