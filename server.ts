import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

// Permissive CORS middleware for cross-origin and iframe requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

const PRIMARY_MODEL = 'gemini-3.8-flash';
const SECONDARY_MODEL = 'gemini-3.1-flash-lite';
const TERTIARY_MODEL = 'gemini-3.5-flash';

// Helper to get GoogleGenAI client with key validation
const getAiClient = () => {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  if (!apiKey) {
    const error = new Error("Gemini API key is not configured. Please select or add your GEMINI_API_KEY in the Settings > Secrets panel in AI Studio.");
    (error as any).statusCode = 401;
    throw error;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Helper to create a request timeout race
const withTimeout = <T>(promise: Promise<T>, ms: number = 30000, operationName: string = "Operation"): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${Math.round(ms / 1000)}s.`));
    }, ms);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
};

// Robust generator with automatic tiered fallback on timeouts or 503 capacity spikes
async function generateWithFallback(ai: GoogleGenAI, generateParams: any) {
  // 1. First attempt: Primary model (gemini-3.8-flash) with a 5-second timeout to quickly catch capacity spikes
  try {
    const primaryParams = {
      ...generateParams,
      model: PRIMARY_MODEL,
      config: generateParams.config ? { ...generateParams.config } : undefined,
    };
    return await withTimeout(ai.models.generateContent(primaryParams), 5000, "Primary clinical AI model");
  } catch (primaryErr: any) {
    const errMsg = String(primaryErr?.message || primaryErr || '');
    console.warn(`Primary model (${PRIMARY_MODEL}) unavailable or slow: ${errMsg.slice(0, 80)}. Falling back to ${SECONDARY_MODEL}...`);
    
    // 2. Second attempt: High-speed secondary model (gemini-3.1-flash-lite)
    try {
      const secondaryParams = {
        ...generateParams,
        model: SECONDARY_MODEL,
        config: generateParams.config ? { ...generateParams.config } : undefined,
      };
      if (secondaryParams.config?.thinkingConfig) {
        delete secondaryParams.config.thinkingConfig;
      }
      return await withTimeout(ai.models.generateContent(secondaryParams), 30000, "Secondary clinical AI model");
    } catch (secondaryErr: any) {
      const secMsg = String(secondaryErr?.message || secondaryErr || '');
      console.warn(`Secondary model (${SECONDARY_MODEL}) unavailable: ${secMsg.slice(0, 80)}. Falling back to ${TERTIARY_MODEL}...`);
      
      // 3. Third attempt: Tertiary model (gemini-3.5-flash)
      const tertiaryParams = {
        ...generateParams,
        model: TERTIARY_MODEL,
        config: generateParams.config ? { ...generateParams.config } : undefined,
      };
      if (tertiaryParams.config?.thinkingConfig) {
        delete tertiaryParams.config.thinkingConfig;
      }
      return await withTimeout(ai.models.generateContent(tertiaryParams), 30000, "Tertiary clinical AI model");
    }
  }
}

// API: Server & Key Status Check
app.get('/api/status', (req, res) => {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    primaryModel: PRIMARY_MODEL,
    secondaryModel: SECONDARY_MODEL,
    fallbackModel: TERTIARY_MODEL
  });
});

// GET status / info for clinical endpoints to prevent 405 Method Not Allowed when pinged or inspected
app.get(['/api/clinical/analyze', '/api/clinical/analyze/'], (req, res) => {
  res.json({ status: 'ok', endpoint: '/api/clinical/analyze', method: 'POST', description: 'Send POST with { noteText: string } to analyze clinical documentation.' });
});
app.get(['/api/clinical/summary', '/api/clinical/summary/'], (req, res) => {
  res.json({ status: 'ok', endpoint: '/api/clinical/summary', method: 'POST', description: 'Send POST with { noteText: string } to generate clinical summaries.' });
});
app.get(['/api/clinical/improve-hpi', '/api/clinical/improve-hpi/'], (req, res) => {
  res.json({ status: 'ok', endpoint: '/api/clinical/improve-hpi', method: 'POST', description: 'Send POST with { noteText: string } to polish HPI narrative flow.' });
});

// API: Clinical Note Analysis
app.post(['/api/clinical/analyze', '/api/clinical/analyze/'], async (req, res) => {
  try {
    const { noteText } = req.body || {};
    if (!noteText || typeof noteText !== 'string' || noteText.trim().length < 10) {
      return res.status(400).json({ error: 'Clinical note text is required (minimum 10 characters).' });
    }

    const ai = getAiClient();

    const response = await generateWithFallback(ai, {
      contents: `Analyze this clinical SOAP note thoroughly and provide structured clinical intelligence:

1. Recommended Follow-up Questions: Specific pertinent positive/negative questions to ask the patient.
2. Examination Maneuvers: Targeted physical examination maneuvers relevant to the presentation.
3. Differential Diagnoses:
   - Provide a clear diagnostic rationale.
   - Evidence-based formal diagnostic criteria if applicable (e.g., Centor, DSM-5, Jones, ACR).
   - Validated clinical scoring system if calculable from note data (e.g. Wells, CURB-65, CHA2DS2-VASc, MELD, RCRI).
4. Proposed Patient Plan:
   - Summary: Overall clinical management strategy (e.g. active treatment, conservative observation, or urgent workup).
   - Diagnostics: Further labs, diagnostic tests, or imaging needed (e.g., CBC, Creatinine, Chest X-ray, Ultrasound, or 'None currently indicated').
   - Medications: Medication adjustments or initial therapies (Action: Start / Continue / Adjust / Hold / Symptomatic / None, drug name, dosage, instructions/rationale).
   - Referrals: Specialist or multidisciplinary referrals (e.g., Cardiology, Nephrology, Nutrition, or 'None indicated at this time').
   - Lifestyle & Precautions: Non-pharmacological measures, dietary guidance, red-flag return warnings.
   - Disposition & Follow-Up: Specific observation and follow-up timeline (e.g., "Observe closely; follow-up in clinic in 3-5 days or sooner if worsening", "Immediate ED evaluation", etc.).

Note Content:
${noteText}`,
      config: {
        systemInstruction: "You are an expert clinical decision support tool aiding healthcare providers. Base your analysis on established medical guidelines, evidence-based criteria, and clinical scoring systems. Always generate a structured proposed plan covering diagnostics, medications, referrals, lifestyle/warnings, and disposition/follow-up. Respond strictly in JSON format.",
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Pertinent clinical questions to ask the patient."
            },
            tests: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Targeted physical examination maneuvers."
            },
            differentials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  diagnosis: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                  isMostLikely: { type: Type.BOOLEAN },
                  criteria: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Formal diagnostic criteria steps or requirements."
                  },
                  score: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      value: { type: Type.NUMBER },
                      max: { type: Type.NUMBER },
                      breakdown: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      interpretation: { type: Type.STRING }
                    },
                    required: ["name", "value", "max", "breakdown", "interpretation"]
                  }
                },
                required: ["diagnosis", "rationale", "isMostLikely"]
              }
            },
            proposedPlan: {
              type: Type.OBJECT,
              properties: {
                summary: { 
                  type: Type.STRING, 
                  description: "Executive summary of the proposed clinical management strategy." 
                },
                diagnostics: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Further diagnostic workup, labs, or imaging needed."
                },
                medications: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      action: { type: Type.STRING, description: "Action: Start | Continue | Adjust | Hold | Symptomatic | None" },
                      name: { type: Type.STRING, description: "Drug name" },
                      dosage: { type: Type.STRING, description: "Dosage, route, and frequency if applicable" },
                      instructions: { type: Type.STRING, description: "Instructions, rationale, or duration" }
                    },
                    required: ["action", "name"]
                  },
                  description: "Medication plan details."
                },
                referrals: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Specialist or allied healthcare referrals."
                },
                lifestyleOrPrecautions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Non-pharmacological guidance, diet/lifestyle, or red flag symptoms."
                },
                dispositionAndFollowUp: {
                  type: Type.STRING,
                  description: "Observation timeline, clinic follow-up date, or disposition instructions."
                }
              },
              required: ["summary", "diagnostics", "medications", "referrals", "lifestyleOrPrecautions", "dispositionAndFollowUp"]
            }
          },
          required: ["questions", "tests", "differentials", "proposedPlan"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(502).json({ error: "Empty response received from clinical intelligence model." });
    }
    const data = JSON.parse(text);
    return res.json(data);
  } catch (error: any) {
    console.error("Clinical analysis server error:", error);
    const status = error.statusCode || 500;
    let message = error.message || "Failed to analyze clinical note.";
    if (message.includes("API key not valid") || message.includes("API_KEY_INVALID") || message.includes("PERMISSION_DENIED") || message.includes("unregistered callers")) {
      message = "Gemini API key is not configured or invalid. Please check the Settings > Secrets panel in AI Studio to select or provide your GEMINI_API_KEY.";
    } else if (message.includes("503") || message.includes("high demand") || message.includes("UNAVAILABLE")) {
      message = "The AI model is experiencing a temporary capacity spike in Google AI. Please click 'Run Analysis' again in a few seconds.";
    }
    return res.status(status).json({ error: message });
  }
});

// API: Clinical Summary (Handoff & 5-sentence SO)
app.post(['/api/clinical/summary', '/api/clinical/summary/'], async (req, res) => {
  try {
    const { noteText } = req.body || {};
    if (!noteText || typeof noteText !== 'string') {
      return res.status(400).json({ error: 'Clinical note text is required.' });
    }

    const ai = getAiClient();

    const response = await generateWithFallback(ai, {
      contents: `Generate two types of summaries for this note:
1. A professional handoff summary focusing on assessment and plan.
2. A strict 5-sentence summary covering only Subjective and Objective findings.

CRITICAL: Do not use any markdown formatting like asterisks (**) or hashes (#). Use plain text only.

Note: ${noteText}`,
      config: {
        systemInstruction: "You are a senior physician. Provide structured professional summaries. Do not use markdown (no bolding, no italics, no bullet points). Respond strictly in JSON format.",
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            handoff: { 
              type: Type.STRING, 
              description: "Professional medical handoff summary without markdown." 
            },
            conciseSO: { 
              type: Type.STRING, 
              description: "An exactly 5-sentence summary of Subjective and Objective findings without markdown." 
            }
          },
          required: ["handoff", "conciseSO"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(502).json({ error: "Empty response from summary model." });
    }
    const data = JSON.parse(text);
    return res.json(data);
  } catch (error: any) {
    console.error("Clinical summary server error:", error);
    const status = error.statusCode || 500;
    let message = error.message || "Failed to generate clinical summary.";
    if (message.includes("API key not valid") || message.includes("API_KEY_INVALID") || message.includes("PERMISSION_DENIED") || message.includes("unregistered callers")) {
      message = "Gemini API key is not configured or invalid. Please check the Settings > Secrets panel in AI Studio to select or provide your GEMINI_API_KEY.";
    } else if (message.includes("503") || message.includes("high demand") || message.includes("UNAVAILABLE")) {
      message = "The AI model is experiencing a temporary capacity spike in Google AI. Please try again in a few seconds.";
    }
    return res.status(status).json({ error: message });
  }
});

// API: Polish HPI Narrative Flow
app.post(['/api/clinical/improve-hpi', '/api/clinical/improve-hpi/'], async (req, res) => {
  try {
    const { noteText } = req.body || {};
    if (!noteText || typeof noteText !== 'string') {
      return res.status(400).json({ error: 'Clinical note text is required.' });
    }

    const ai = getAiClient();

    const response = await generateWithFallback(ai, {
      contents: `Read the following clinical note. Specifically identify the 'History of Present Illness' (HPI) section (or the subjective narrative). 

Rewrite ONLY the HPI section to improve its grammar, flow, and sentence structure, making it sound more professional and medically precise. 

Rules:
1. Do NOT summarize. 
2. Do NOT change the medical facts or meaning.
3. Keep all other sections (Objective, Assessment, Plan, Vitals, etc.) EXACTLY as they are. 
4. Return the FULL clinical note with the improved HPI.

Note: ${noteText}`,
      config: {
        systemInstruction: "You are a specialized medical editor. Your task is to polish the narrative flow of the HPI while preserving the integrity of the rest of the documentation.",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      }
    });

    const improvedNote = response.text || noteText;
    return res.json({ improvedNote });
  } catch (error: any) {
    console.error("HPI improvement server error:", error);
    const status = error.statusCode || 500;
    let message = error.message || "Failed to improve HPI narrative.";
    if (message.includes("API key not valid") || message.includes("API_KEY_INVALID") || message.includes("PERMISSION_DENIED") || message.includes("unregistered callers")) {
      message = "Gemini API key is not configured or invalid. Please check the Settings > Secrets panel in AI Studio to select or provide your GEMINI_API_KEY.";
    } else if (message.includes("503") || message.includes("high demand") || message.includes("UNAVAILABLE")) {
      message = "The AI model is experiencing a temporary capacity spike in Google AI. Please try again in a few seconds.";
    }
    return res.status(status).json({ error: message });
  }
});

// Dev vs Prod Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
