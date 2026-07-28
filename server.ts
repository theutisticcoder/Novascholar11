import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 50MB limit to handle uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for Google Gen AI client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey ="AQ.Ab8RN6LU9fmeH2zsu4TqSThFZc8afmu3Vn0WeuKK38xWKH2fnw";
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Please add it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Check API key configuration endpoint
app.get("/api/gemini/config", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({ configured: hasKey });
});

// 1. Image OCR and Handwritten Math Parser
app.post("/api/gemini/ocr", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body." });
    }

    const ai = getAiClient();
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: imageBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        imagePart,
        "Analyze this image which contains academic notes, handwriting, sketches, or math equations.\n" +
        "1. Extract all legible handwritten or typed text.\n" +
        "2. Detect any mathematical formulas, converting them carefully to standard LaTeX notation. Use $$...$$ for block/display math and $...$ for inline math.\n" +
        "3. Describe any drawings, charts, or visual sketches present in detail so they can be represented as structured textual/visual concepts.\n" +
        "4. Organize everything into a neat, structured, academic study note outline with headers, subheaders, and bullet points.",
      ],
    });

    res.json({ result: response.text });
  } catch (error: any) {
    console.error("OCR API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during OCR analysis." });
  }
});

// 2. Audio Transcript and Speech Notes Parser
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Missing audioBase64 in request body." });
    }

    const ai = getAiClient();
    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        audioPart,
        "Listen to this audio recording of an academic lecture, study group, or dictate.\n" +
        "1. Provide a highly accurate, word-for-word transcript where possible, filtering out stuttering, background noise, and filler words (um, like, uh).\n" +
        "2. Generate a summarized study summary section containing the main topics discussed, primary definitions, and a set of key actionable key takeaways.",
      ],
    });

    res.json({ result: response.text });
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

    const ai = getAiClient();
    const prompt = `Create a comprehensive, academic-grade Study Guide for the subject: "${subject}".\n` +
      `Here is the context and reference notes/material provided:\n` +
      `--- START NOTES ---\n${notesContent || "No detailed notes provided. Generate a high-level guide on typical curriculum for this subject."}\n--- END NOTES ---\n\n` +
      `Structure the response strictly into the requested JSON schema. Translate equations or math to standard LaTeX ($...$ and $$...$$).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { 
              type: Type.STRING, 
              description: "A comprehensive, beautifully structured study guide in Markdown. Include detailed theory, formulas, concept breakdowns, and examples formatted using LaTeX notation." 
            },
            summaryPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A bulleted list of 5-8 primary high-level takeaways or key learning outcomes."
            },
            keyTerms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING }
                },
                required: ["term", "definition"]
              },
              description: "Glossary of essential technical vocabulary, jargon, or historical names with precise academic definitions."
            }
          },
          required: ["title", "content", "summaryPoints", "keyTerms"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
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

    const ai = getAiClient();
    const qCount = Math.min(Math.max(Number(count) || 5, 2), 15);
    const prompt = `Generate an interactive academic multiple-choice quiz on the topic: "${subject}".\n` +
      `The quiz should contain exactly ${qCount} questions of varying difficulty (easy, medium, hard).\n` +
      `Reference notes context:\n` +
      `--- NOTES START ---\n${notesContent || "No context notes provided. Generate based on standard course curriculum."}\n--- NOTES END ---\n\n` +
      `Provide four (4) distinct, realistic options for each question. One option must be strictly correct. Provide a thorough, educational explanation of why the correct option is right and others are wrong. Make sure mathematical symbols or equations are in standard LaTeX ($...$).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING, description: "The quiz question. Clear, academically robust." },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exactly four multiple-choice options."
                  },
                  answer: { type: Type.INTEGER, description: "0-indexed index (0, 1, 2, or 3) representing the correct option in options array." },
                  explanation: { type: Type.STRING, description: "Detailed educational rationale for the answer." }
                },
                required: ["question", "options", "answer", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
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

    const ai = getAiClient();
    const cardCount = Math.min(Math.max(Number(count) || 8, 4), 20);
    const prompt = `Generate exactly ${cardCount} active-recall study flashcards on "${subject}".\n` +
      `Context notes:\n` +
      `--- NOTES ---\n${notesContent || "No specific notes provided. Generate typical academic cards on typical student syllabus."}\n--- NOTES ---\n\n` +
      `Each card must have a brief, clear, trigger question or key term on the 'front', and a precise, comprehensive, yet digestible answer or conceptual definition on the 'back'. Ensure formulas are LaTeX-formatted ($...$).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING }
            },
            required: ["front", "back"]
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "[]");
    res.json({ flashcards: parsedData });
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

    const ai = getAiClient();
    const aiPrompt = `Convert the following mathematical concept, equation description, or natural language request into standard, clean LaTeX code.\n` +
      `User Request: "${prompt}"\n\n` +
      `Provide ONLY valid LaTeX code without enclosing dollars ($ or $$). Return JSON schema format with 'latex' and 'description'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: aiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            latex: { type: Type.STRING, description: "Clean LaTeX code without enclosing $ or $$ signs." },
            description: { type: Type.STRING, description: "Short 1-sentence math explanation of what this equation represents." }
          },
          required: ["latex", "description"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
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
