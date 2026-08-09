import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Mistral } from "@mistralai/mistralai";
import { GoogleGenAI, Type } from "@google/genai";
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

// Lazy initializer for Google Gen AI client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "AI_STUDIO_DEFAULT_KEY";
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

// Falling back from 3.5 flash-lite to 3.1 flash-lite and older/other flash lites when limits are hit
const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite", // 3.5 flash-lite
  "gemini-3.1-flash-lite", // 3.1 flash-lite
  "gemini-2.5-flash",      // 2.5 flash
  "gemini-1.5-flash"       // 1.5 flash
];

async function callGeminiWithFallback(config: {
  contents: any;
  responseMimeType?: string;
  responseSchema?: any;
}) {
  const ai = getAiClient();
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`Attempting Gemini generation using model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: config.contents,
        config: {
          responseMimeType: config.responseMimeType,
          responseSchema: config.responseSchema,
        }
      });
      console.log(`Successfully completed Gemini generation with model: ${modelName}`);
      return response;
    } catch (err: any) {
      console.warn(`Model ${modelName} failed or limit reached. Error: ${err?.message || err}`);
      lastError = err;
    }
  }

  throw new Error(`All Gemini Flash-Lite fallback models failed. Last error: ${lastError?.message || lastError}`);
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

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: imageBase64,
      },
    };

    const promptText = "Analyze this image which contains academic notes, handwriting, sketches, or math equations.\n" +
      "1. Extract all legible handwritten or typed text.\n" +
      "2. Detect any mathematical formulas, converting them carefully to standard LaTeX notation. Use $$...$$ for block/display math and $...$ for inline math.\n" +
      "3. Describe any drawings, charts, or visual sketches present in detail so they can be represented as structured textual/visual concepts.\n" +
      "4. Organize everything into a neat, structured, academic study note outline with headers, subheaders, and bullet points.";

    const response = await callGeminiWithFallback({
      contents: [imagePart, promptText]
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

    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audioBase64,
      },
    };

    const promptText = "Listen to and process this audio recording notes context.\n" +
      "1. Provide a highly accurate academic transcript filtering out stuttering and filler words.\n" +
      "2. Generate a structured study summary section with key definitions and actionable takeaways.";

    const response = await callGeminiWithFallback({
      contents: [audioPart, promptText]
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

    const prompt = `Create a comprehensive, academic-grade Study Guide for the subject: "${subject}".\n` +
      `Here is the context and reference notes/material provided:\n` +
      `--- START NOTES ---\n${notesContent || "No detailed notes provided. Generate a high-level guide on typical curriculum for this subject."}\n--- END NOTES ---\n\n` +
      `Translate equations or math to standard LaTeX ($...$ and $$...$$).\n` +
      `Respond ONLY with a valid JSON object matching the defined study guide schema.`;

    const response = await callGeminiWithFallback({
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          summaryPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
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
            }
          }
        },
        required: ["title", "content", "summaryPoints", "keyTerms"]
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

    const qCount = Math.min(Math.max(Number(count) || 5, 2), 15);
    const prompt = `Generate an interactive academic multiple-choice quiz on the topic: "${subject}".\n` +
      `The quiz should contain exactly ${qCount} questions of varying difficulty (easy, medium, hard).\n` +
      `Reference notes context:\n` +
      `--- NOTES START ---\n${notesContent || "No context notes provided. Generate based on standard course curriculum."}\n--- NOTES END ---\n\n` +
      `Provide four (4) distinct, realistic options for each question. One option must be strictly correct. Provide a thorough, educational explanation of why the correct option is right. Make sure mathematical symbols or equations are in standard LaTeX ($...$).`;

    const response = await callGeminiWithFallback({
      contents: prompt,
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
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                answer: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "answer", "explanation"]
            }
          }
        },
        required: ["title", "questions"]
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

    const cardCount = Math.min(Math.max(Number(count) || 8, 4), 20);
    const prompt = `Generate exactly ${cardCount} active-recall study flashcards on "${subject}".\n` +
      `Context notes:\n` +
      `--- NOTES ---\n${notesContent || "No specific notes provided. Generate typical academic cards on typical student syllabus."}\n--- NOTES ---\n\n` +
      `Each card must have a trigger question on 'front' and a conceptual answer on 'back'. Ensure formulas are LaTeX ($...$).`;

    const response = await callGeminiWithFallback({
      contents: prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          flashcards: {
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
        },
        required: ["flashcards"]
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json({ flashcards: parsedData.flashcards || [] });
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

    const aiPrompt = `Convert the following mathematical concept, equation description, or natural language request into standard, clean LaTeX code.\n` +
      `User Request: "${prompt}"\n\n` +
      `Provide ONLY valid LaTeX code without enclosing dollars ($ or $$).`;

    const response = await callGeminiWithFallback({
      contents: aiPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          latex: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["latex", "description"]
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("LaTeX Helper API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred converting to LaTeX." });
  }
});

// 7. Combined AI Curriculum and Lesson Builder
app.post("/api/gemini/curriculum", async (req, res) => {
  try {
    const { subject, notesContent } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Missing subject in request body." });
    }

    const promptText = `Generate a fully integrated, comprehensive academic Curriculum and modular Lesson Builder for the subject: "${subject}".\n` +
      `Below is the raw note content provided as background context:\n` +
      `--- CONTEXT NOTES START ---\n${notesContent || "No context notes provided. Generate a full foundational curriculum based on standard collegiate syllabus."}\n--- CONTEXT NOTES END ---\n\n` +
      `Your output must divide this subject into exactly 3 robust, logical, chronological Lesson Chunks (e.g. Lesson 1, Lesson 2, Lesson 3).\n` +
      `For EACH lesson chunk, you must provide:\n` +
      `1. A Title and estimated completion Duration (e.g., "15 mins").\n` +
      `2. A comprehensive, beautifully formatted Explanation lecture in Markdown. Include formulas formatted in standard LaTeX ($...$ and $$...$$).\n` +
      `3. A Multimedia conceptGraph detailing the relationships between the key concepts of that specific lesson. Include at least 3-5 concept nodes with custom descriptive labels and 2-4 linkage paths describing relationships.\n` +
      `4. A Quiz of exactly 3 relevant multiple-choice questions for that lesson, complete with explanations.\n` +
      `5. Exactly 3 active-recall Flashcards (front and back) for student self-testing.\n\n` +
      `Strictly output a JSON object matching the defined curriculum response schema. Use LaTeX for math symbols.`;

    const response = await callGeminiWithFallback({
      contents: promptText,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          curriculumTitle: { type: Type.STRING },
          curriculumOverview: { type: Type.STRING },
          lessons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                duration: { type: Type.STRING },
                explanation: { type: Type.STRING },
                conceptGraph: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    nodes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          label: { type: Type.STRING },
                          description: { type: Type.STRING },
                          val: { type: Type.INTEGER }
                        },
                        required: ["id", "label", "description", "val"]
                      }
                    },
                    links: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          source: { type: Type.STRING },
                          target: { type: Type.STRING },
                          relationship: { type: Type.STRING }
                        },
                        required: ["source", "target", "relationship"]
                      }
                    }
                  },
                  required: ["title", "nodes", "links"]
                },
                quiz: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      answer: { type: Type.INTEGER },
                      explanation: { type: Type.STRING }
                    },
                    required: ["question", "options", "answer", "explanation"]
                  }
                },
                flashcards: {
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
              },
              required: ["id", "title", "duration", "explanation", "conceptGraph", "quiz", "flashcards"]
            }
          }
        },
        required: ["curriculumTitle", "curriculumOverview", "lessons"]
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Combined Curriculum API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred generating curriculum lessons." });
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

