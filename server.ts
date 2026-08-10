import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Mistral } from "@mistralai/mistralai";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import Inception from 'inceptionai';

const client = new Inception({
  apiKey: process.env['KEY'], // defaults to this env var; can be omitted
});
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

// Falling back strictly using flash-lite models as requested by user
const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite", // 3.5 flash-lite (Primary)
  "gemini-3.1-flash-lite", // 3.1 flash-lite (Secondary)
  "gemini-1.5-flash"       // Standard Flash fallback
];

async function callGeminiWithFallback(config: {
  contents: any;
  responseMimeType?: string;
  responseSchema?: any;
}) {
  const ai = getAiClient();
  let lastError: any = null;

    try {
      const response = await client.chat.completions.create({
        model: "mercury-2",
        messages: config.contents,
        config: {
          response_format: config.responseSchema,
        }
      });
      return response;
    } catch (err: any) {
      lastError = err;
    }
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

// 2.1 PDF Document Notes Parser
app.post("/api/gemini/pdf-notes", async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "Missing pdfBase64 in request body." });
    }

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    };

    const promptText = "Analyze this PDF document carefully.\n" +
      "1. Extract the main academic content, structuring it into clear sections with headers.\n" +
      "2. Identify key definitions, theories, and concepts.\n" +
      "3. Convert any mathematical formulas to standard LaTeX notation ($...$ and $$...$$).\n" +
      "4. Provide a comprehensive summary that acts as a standalone study note.";

    const response = await callGeminiWithFallback({
      contents: [pdfPart, promptText]
    });

    res.json({ result: response.text });
  } catch (error: any) {
    console.error("PDF Parsing API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during PDF parsing." });
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

// 7. AI Curriculum Structure Builder (generates 10 topics at a time, up to 25-30 total)
app.post("/api/gemini/curriculum", async (req, res) => {
  try {
    const { subject, notesContent, pdfBase64, existingLessons } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Missing subject in request body." });
    }

    const hasExisting = Array.isArray(existingLessons) && existingLessons.length > 0;
    const existingCount = hasExisting ? existingLessons.length : 0;

    let promptText = "";
    if (hasExisting) {
      promptText = `You are an academic curriculum designer. We are incrementally building a detailed curriculum of 25-30 topics for the subject: "${subject}".\n` +
        `We have already generated the first ${existingCount} lessons/topics:\n` +
        existingLessons.map((l: any, i: number) => ` - Unit ${i + 1}: ${l.title}`).join("\n") + "\n\n" +
        `Now, please generate the NEXT 10 sequential, distinct lessons/topics for this curriculum.\n` +
        `Ensure these continuation topics flow logically, do not repeat existing ones, and are numbered starting from Unit ${existingCount + 1}.\n` +
        `For EACH of these 10 new lessons/topics, provide:\n` +
        `1. A Title.\n` +
        `2. A short duration estimate (e.g. "15 mins").\n` +
        `3. A unique ID (e.g. "topic-${existingCount + 1}").\n\n` +
        `Respond with a JSON object matching the defined curriculum skeleton schema. Keep curriculumTitle and curriculumOverview consistent or complementary to the subject. Each lesson content should provide in depth content and at least 2 real examples (math/english) or real world scenarios (other topics) of the topic.`;
    } else {
      promptText = `You are an academic curriculum designer. Generate the FIRST 10 sequential, distinct lessons/topics for a comprehensive academic Curriculum Skeleton for the subject: "${subject}".\n` +
        `We plan to build a complete curriculum of 25-30 topics in multiple generations (generating 10 lessons at a time).\n` +
        `Make sure this first batch sets up a strong foundation and is ready for subsequent expansion.\n` +
        `For EACH of these first 10 lessons/topics, provide:\n` +
        `1. A Title.\n` +
        `2. A short duration estimate (e.g. "15 mins").\n` +
        `3. A unique ID (e.g. "topic-1").\n\n` +
        `Respond with a JSON object matching the defined curriculum skeleton schema. Provide a descriptive curriculumTitle and curriculumOverview. Each lesson content should provide in depth content and at least 2 real examples (math/english) or real world scenarios (other topics) of the topic.`;
    }

    if (pdfBase64) {
      promptText += `\n\nUse the attached PDF document as the primary curriculum source. Extract and align the topics directly with the material, chapters, or units present in this PDF context.`;
    } else if (notesContent) {
      promptText += `\n\nUse the following course notes as context:\n--- NOTES CONTEXT ---\n${notesContent}\n--- NOTES CONTEXT ---`;
    }

    const contents: any[] = [];
    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      });
    }
    contents.push(promptText);

    const response = await callGeminiWithFallback({
      contents: contents,
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
                duration: { type: Type.STRING }
              },
              required: ["id", "title", "duration"]
            }
          }
        },
        required: ["curriculumTitle", "curriculumOverview", "lessons"]
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Curriculum API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred generating curriculum lessons." });
  }
});

// 7.1 AI Curriculum Chunk Builder (generates 10 fully complete lessons at a time)
app.post("/api/gemini/curriculum-chunk", async (req, res) => {
  try {
    const { subject, notesContent, pdfBase64, startIndex, existingLessons } = req.body;
    if (!subject) {
      return res.status(400).json({ error: "Missing subject in request body." });
    }

    const hasExisting = Array.isArray(existingLessons) && existingLessons.length > 0;
    const startNum = Number(startIndex) || (hasExisting ? existingLessons.length + 1 : 1);

    let promptText = `You are an academic curriculum designer. We are incrementally building a highly detailed, completed 30-lesson curriculum for the subject: "${subject}".\n` +
      `We generate this curriculum in sequence in 3 distinct chunks of exactly 10 fully finished lessons each.\n`;

    if (hasExisting) {
      promptText += `We have already generated the first ${existingLessons.length} lessons. Here are their titles for context:\n` +
        existingLessons.map((l: any, i: number) => ` - Lesson ${i + 1}: ${l.title}`).join("\n") + "\n\n" +
        `Now, please generate the NEXT chunk of exactly 10 sequential, distinct, fully completed lessons/topics (Lessons ${startNum} to ${startNum + 9}).\n` +
        `Ensure these continuation topics flow logically, do not repeat existing ones, and are numbered starting from Unit ${startNum}.\n`;
    } else {
      promptText += `Please generate the FIRST chunk of exactly 10 fully completed, sequential lessons/topics (Lessons 1 to 10).\n` +
        `Make sure this first batch builds the fundamental background for the subject.\n`;
    }

    promptText += `\nCRITICAL FORMATTING INSTRUCTIONS:\n` +
      `1. For each of the 10 lessons in this chunk, you must generate the complete lesson content immediately (explanation, conceptGraph, quiz, and flashcards).\n` +
      `2. Do NOT use Markdown (Md) anywhere in the lesson explanations or text fields. Do not use asterisks (**), hashtags (#), or markdown code blocks.\n` +
      `3. Write all lesson explanations as beautifully styled HTML text strings using standard HTML tags: <p>, <strong>, <em>, <ul>, <li>, <h3>, <h4>, <code>, <pre>, <br>. This allows the content to render perfectly as HTML on the frontend.\n` +
      `4. If there are mathematical formulas, use standard LaTeX notation ($...$ for inline and $$...$$ for display equations) within the HTML or text fields.\n` +
      `5. Each lesson must include a unique conceptGraph with 3-5 nodes and 2-4 links illustrating the relationships of terms in this specific lesson.\n` +
      `6. Each lesson must include exactly 3 multiple choice quiz questions (the answer field must be the 0-indexed integer index of the correct option in the options array).\n` +
      `7. Each lesson must include exactly 3 active-recall flashcards with a front (question) and back (answer).\n\n` +
      `Keep explanation HTML sections concise (around 150-250 words per lesson) to remain within token limits, but highly informative and ready to learn.`;

    if (pdfBase64) {
      promptText += `\n\nUse the attached PDF document as the primary curriculum source. Extract and align the topics directly with the material, chapters, or units present in this PDF context.`;
    } else if (notesContent) {
      promptText += `\n\nUse the following course notes as context:\n--- NOTES CONTEXT ---\n${notesContent}\n--- NOTES CONTEXT ---`;
    }

    const contents: any[] = [];
    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      });
    }
    contents.push(promptText);

    const response = await callGeminiWithFallback({
      contents: contents,
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
                explanation: { type: Type.STRING, description: "Detailed academic explanation formatted entirely in clean, semantic HTML (e.g., using <p>, <strong>, <em>, <ul>, <li>, <h3>, <h4>). Do NOT use any Markdown formatting." },
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
    console.error("Curriculum Chunk API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred generating curriculum chunk." });
  }
});

// 8. AI Lesson Content Builder (Lazy Loader fallback, uses HTML instead of Markdown)
app.post("/api/gemini/lesson-content", async (req, res) => {
  try {
    const { subject, topicTitle, notesContent } = req.body;
    if (!subject || !topicTitle) {
      return res.status(400).json({ error: "Missing subject or topicTitle in request body." });
    }

    const promptText = `Generate detailed academic lesson content for the specific topic: "${topicTitle}" within the broader subject of "${subject}".\n` +
      `Reference notes context:\n` +
      `--- NOTES ---\n${notesContent || "Use standard academic knowledge."}\n--- NOTES ---\n\n` +
      `Provide:\n` +
      `1. A comprehensive, beautifully formatted Explanation lecture in clean HTML. Do NOT use Markdown (No asterisks, no hashtags). Use tags: <p>, <strong>, <em>, <ul>, <li>, <h3>, <h4>, <code>. Include formulas in standard LaTeX ($...$ and $$...$$).\n` +
      `2. A conceptGraph detailing the relationships between key concepts of THIS topic. Include 3-5 concept nodes and 2-4 linkage paths.\n` +
      `3. A Quiz of exactly 3 relevant multiple-choice questions with explanations.\n` +
      `4. Exactly 3 active-recall Flashcards (front and back).\n\n` +
      `Respond with a JSON object matching the lesson content schema.`;

    const response = await callGeminiWithFallback({
      contents: promptText,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING, description: "Detailed explanation formatted in semantic HTML. No Markdown." },
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
        required: ["explanation", "conceptGraph", "quiz", "flashcards"]
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Lesson Content API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred generating lesson content." });
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

