import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with generous limit to hold raw base64 images
app.use(express.json({ limit: "20mb" }));

// Main identification endpoint
app.post("/api/identify", async (req, res) => {
  try {
    const { image, mimeType, customApiKey } = req.body;

    if (!image) {
      return res.status(400).json({ error: { message: "No image payload supplied." } });
    }

    // Determine the API Key to use: custom key provided, or system GEMINI_API_KEY
    const apiKey = customApiKey ? customApiKey.trim() : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: {
          message: "No Gemini API key found. Please define GEMINI_API_KEY in the Environment Secrets, or enter a custom key."
        }
      });
    }

    // Initialize GoogleGenAI
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: image,
      }
    };

    const textPart = {
      text: "What is this? Identify it clearly and explain what it is, any interesting facts about it, and anything useful the person should know. Keep it friendly and under 150 words."
    };

    // Call the recommended model: gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [imagePart, textPart]
      }
    });

    const resultText = response.text || "Could not identify the item.";
    return res.json({ text: resultText });

  } catch (error: any) {
    console.error("Server-side identify error:", error);
    const errorMessage = error.message || "Unknown error during frame evaluation.";
    return res.status(500).json({ error: { message: errorMessage } });
  }
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback handling
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server is running on http://localhost:${PORT}`);
  });
}

startServer();
