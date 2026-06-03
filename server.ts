import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 10MB limit for base64 images
  app.use(express.json({ limit: "10mb" }));

  let aiInstance: GoogleGenAI | null = null;

  function getGeminiClient(): GoogleGenAI {
    if (!aiInstance) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is required.");
      }
      aiInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiInstance;
  }

  // API Route to identify anything in the sent frame base64 string
  app.post("/api/identify", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing image data" });
      }

      const ai = getGeminiClient();

      let mimeType = "image/jpeg";
      let base64Data = image;

      if (image.startsWith("data:")) {
        const match = image.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      };

      const textPart = {
        text: "What is this? Identify it clearly and explain what it is, any interesting facts about it, and anything useful the person should know. Keep it friendly and under 150 words.",
      };

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] },
      });

      const text = aiResponse.text || "Could not identify the item.";
      return res.json({ result: text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({
        error: error.message || "Failed to process image with AI",
      });
    }
  });

  // Serve Frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
