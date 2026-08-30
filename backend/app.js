import cors from "cors";
import express from "express";
import { config } from "./config/env.js";
import { chatRouter } from "./routes/chat-routes.js";
import { documentosRouter } from "./routes/documentos-routes.js";
import { listarProveedores } from "./services/ai/ai.service.js";
import { obtenerContextoSistema } from "./services/contexto-sistema.service.js";

export const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("¡Mi asistente IA está funcionando!");
});

// Radiografia del sistema: sirve para verificar el contexto y los
// proveedores sin gastar una sola llamada a las APIs de IA.
app.get("/api/estado", (req, res) => {
  res.json({
    estado: "activo",
    contexto: obtenerContextoSistema(),
    modelos: listarProveedores(),
  });
});

app.use("/api", chatRouter);
app.use("/api/documentos", documentosRouter);

// Red de seguridad: cualquier error no capturado en una ruta
// termina aqui como JSON, no como un HTML de Express.
app.use((error, req, res, next) => {
  console.error("Error no controlado:", error);

  if (res.headersSent) return next(error);

  res.status(500).json({ error: error.message || "Error desconocido." });
});
