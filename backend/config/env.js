import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  geminiApiKey: process.env.GEMINI_API_KEY,
};
