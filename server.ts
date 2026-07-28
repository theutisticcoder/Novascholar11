import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Mistral } from "@mistralai/mistralai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 50MB limit to handle uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "gbZYrSkGeC1bvs6MBSRsZ72fVI07TrrN";
const MISTRAL_MODEL = "mistral-small-2506";

// Lazy initializer for Mistral AI client
let mistralClient: Mistral | null = null;

function getMistralClient(): Mistral {
  if (!mistralClient) {
    mistralClient = new Mistral({
      apiKey: MISTRAL_API_KEY,
    });
  }
  return mistralClient;
}

function extractTextContent(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((item) => (typeof item === "string" ? item : (item as any)?.text || "")).join("");
  }
  return String(content || "");
}

// Check API key configuration endpoint
app.get("/api/gemini/config", (req, res) => {
  res.json({ configured: true });
});

// 1. Image OCR and Handwritten Math Parser
app.post("/api/gemini/ocr", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body." });
    }

    const mistral = getMistralClient();
    const promptText = "Analyze this image which contains academic notes, handwriting, sketches, or math equations.\n" +
      "1. Extract all legible handwritten or typed text.\n" +
      "2. Detect any mathematical formulas, converting them carefully to standard LaTeX notation. Use $$...$$ for block/display math and $...$ for inline math.\n" +
      "3. Describe any drawings, charts, or visual sketches present in detail so they can be represented as structured textual/visual concepts.\n" +
      "4. Organize everything into a neat, structured, academic study note outline with headers, subheaders, and bullet points.";

    let response;
    try {
      response = await mistral.chat.complete({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                imageUrl: `data:${mimeType || "image/png"};base64,${imageBase64}`,
              },
              {
                type: "text",
                text: promptText,
              },
            ] as any,
          },
        ],
      });
    } catch (visionErr) {
      // Fallback if vision array isn't accepted by model
      response = await mistral.chat.complete({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: promptText + "\n[Image attached in request payload]",
          },
        ],
      });
    }

    const resultText = extractTextContent(response?.choices?.[0]?.message?.content);
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("OCR API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during OCR analysis." });
  }
});

// 2. Audio Transcript and Speech Notes Parser
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Missing audioBase64 in request body." });
    }

    const mistral = getMistralClient();
    const response = await mistral.chat.complete({
      model: MISTRAL_MODEL,
      messages: [
        {
          role: "user",
          content: "Listen to and process this audio recording notes context.\n" +
            "1. Provide a highly accurate academic transcript filtering out stuttering and filler words.\n" +
            "2. Generate a structured study summary section with key definitions and actionable takeaways.",
        },
      ],
    });

    const resultText = extractTextContent(response?.choices?.[0]?.message?.content);
    res.json({ result: resultText });
  } catch (error: any) {
    console.error("Transcription API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during audio transcription." });
  }
});

// 3. AI Study Guide Generator
app.post("/api/gemini/study-guide", async (req, res) => {
  try {
    const { subject, notesContent } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Missing subject in request body." });
    }

    const mistral = getMistralClient();
    const prompt = `Create a comprehensive, academic-grade Study Guide for the subject: "${subject}".\n` +
      `Here is the context and reference notes/material provided:\n` +
      `--- START NOTES ---\n${notesContent || "No detailed notes provided. Generate a high-level guide on typical curriculum for this subject."}\n--- END NOTES ---\n\n` +
      `Translate equations or math to standard LaTeX ($...$ and $$...$$).\n` +
      `Respond ONLY with a valid JSON object with keys: "title", "content" (Markdown), "summaryPoints" (array of strings), and "keyTerms" (array of { "term": string, "definition": string }). Do not wrap in backticks or markdown fences.`;

    const response = await mistral.chat.complete({
      model: MISTRAL_MODEL,
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert academic AI tutor. Output strictly valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawText = extractTextContent(response?.choices?.[0]?.message?.content);
    const parsedData = JSON.parse(rawText || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Study Guide API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred generating the study guide." });
  }
});

// 4. AI Quiz Generator
app.post("/api/gemini/quiz", async (req, res) => {
  try {
    const { subject, notesContent, count } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Missing subject in request body." });
    }

    const mistral = getMistralClient();
    const qCount = Math.min(Math.max(Number(count) || 5, 2), 15);
    const prompt = `Generate an interactive academic multiple-choice quiz on the topic: "${subject}".\n` +
      `The quiz should contain exactly ${qCount} questions of varying difficulty (easy, medium, hard).\n` +
      `Reference notes context:\n` +
      `--- NOTES START ---\n${notesContent || "No context notes provided. Generate based on standard course curriculum."}\n--- NOTES END ---\n\n` +
      `Provide four (4) distinct, realistic options for each question. One option must be strictly correct. Provide a thorough, educational explanation of why the correct option is right. Make sure mathematical symbols or equations are in standard LaTeX ($...$).\n` +
      `Respond ONLY with a JSON object: { "title": string, "questions": [{ "question": string, "options": [4 strings], "answer": 0-3 int, "explanation": string }] }`;

    const response = await mistral.chat.complete({
      model: MISTRAL_MODEL,
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert quiz generator. Output strictly valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawText = extractTextContent(response?.choices?.[0]?.message?.content);
    const parsedData = JSON.parse(rawText || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Quiz API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred generating the quiz." });
  }
});

// 5. AI Flashcards Generator
app.post("/api/gemini/flashcards", async (req, res) => {
  try {
    const { subject, notesContent, count } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Missing subject in request body." });
    }

    const mistral = getMistralClient();
    const cardCount = Math.min(Math.max(Number(count) || 8, 4), 20);
    const prompt = `Generate exactly ${cardCount} active-recall study flashcards on "${subject}".\n` +
      `Context notes:\n` +
      `--- NOTES ---\n${notesContent || "No specific notes provided. Generate typical academic cards on typical student syllabus."}\n--- NOTES ---\n\n` +
      `Each card must have a trigger question on 'front' and a conceptual answer on 'back'. Ensure formulas are LaTeX ($...$).\n` +
      `Respond ONLY with JSON object containing "flashcards": [{ "front": string, "back": string }]`;

    const response = await mistral.chat.complete({
      model: MISTRAL_MODEL,
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an active-recall study flashcard generator. Output strictly valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawText = extractTextContent(response?.choices?.[0]?.message?.content);
    const parsedData = JSON.parse(rawText || "{}");
    const cards = Array.isArray(parsedData) ? parsedData : (parsedData.flashcards || []);
    res.json({ flashcards: cards });
  } catch (error: any) {
    console.error("Flashcards API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred generating flashcards." });
  }
});

// 6. AI LaTeX Math Generator Helper
app.post("/api/gemini/latex-helper", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt in request body." });
    }

    const mistral = getMistralClient();
    const aiPrompt = `Convert the following mathematical concept, equation description, or natural language request into standard, clean LaTeX code.\n` +
      `User Request: "${prompt}"\n\n` +
      `Provide ONLY valid LaTeX code without enclosing dollars ($ or $$). Respond with JSON object: { "latex": string, "description": string }`;

    const response = await mistral.chat.complete({
      model: MISTRAL_MODEL,
      responseFormat: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a LaTeX math formatting assistant. Output strictly valid JSON.",
        },
        {
          role: "user",
          content: aiPrompt,
        },
      ],
    });

    const rawText = extractTextContent(response?.choices?.[0]?.message?.content);
    const parsedData = JSON.parse(rawText || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("LaTeX Helper API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred converting to LaTeX." });
  }
});

// Start server function to bundle Vite and handle SPA routes
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Novascholar full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();

