import cors from "cors";
import express from "express";
import { config } from "./config/env.js";
import { chatRouter } from "./routes/chat-routes.js";
import { documentosRouter } from "./routes/documentos-routes.js";

export const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("¡Mi asistente IA está funcionando!");
});

app.get("/api/estado", (req, res) => {
  res.json({ estado: "activo" });
});

app.use("/api", chatRouter);
app.use("/api/documentos", documentosRouter);
