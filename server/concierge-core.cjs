"use strict";

const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
const MAX_BODY_BYTES = 18 * 1024;
const MAX_INTENT_CHARS = 1200;
const MAX_TOOLS = 24;
const MAX_FILES = 24;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 40;

const ALLOWED_MODELS = new Set([DEFAULT_MODEL, FALLBACK_MODEL]);
const ALLOWED_ORIGINS = new Set([
  "https://tools.clawbuis.com",
  "https://www.tools.clawbuis.com",
  "https://clawbuis.com",
  "https://www.clawbuis.com",
  "http://127.0.0.1:8794",
  "http://localhost:8794",
  "http://127.0.0.1:8780",
  "http://localhost:8780"
]);

const buckets = new Map();

function getApiKey(env = process.env) {
  return env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "";
}

function getModel(env = process.env) {
  const value = env.CLAWBUIS_CONCIERGE_MODEL || DEFAULT_MODEL;
  return ALLOWED_MODELS.has(value) ? value : DEFAULT_MODEL;
}

function getStatus(env = process.env) {
  return {
    ok: true,
    service: "clawbuis-tools-concierge",
    provider: "gemini",
    model: getModel(env),
    fallbackModel: FALLBACK_MODEL,
    keyConfigured: Boolean(getApiKey(env)),
    keyExposedToBrowser: false,
    privacy: {
      sendsFileContent: false,
      sendsFileNames: false,
      sendsIntentText: true,
      storesPaymentData: false
    }
  };
}

function json(status, data) {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(data)
  };
}

function fail(status, message, extra = {}) {
  return json(status, { ok: false, error: { message }, ...extra });
}

function safeString(value, max = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files.slice(0, MAX_FILES).map((file, index) => ({
    id: safeString(file.id || `file_${index}`, 80),
    kind: safeString(file.kind || "file", 32),
    type: safeString(file.type || "", 120),
    ext: safeString(file.ext || "", 16),
    sizeBucket: safeString(file.sizeBucket || "unknown", 32)
  }));
}

function normalizeTools(tools) {
  if (!Array.isArray(tools)) return [];
  return tools.slice(0, MAX_TOOLS).map((tool) => ({
    slug: safeString(tool.slug, 80),
    label: safeString(tool.label, 120),
    problem: safeString(tool.problem, 200),
    accepts: Array.isArray(tool.accepts) ? tool.accepts.slice(0, 8).map((x) => safeString(x, 80)) : [],
    outputs: Array.isArray(tool.outputs) ? tool.outputs.slice(0, 8).map((x) => safeString(x, 80)) : [],
    mode: safeString(tool.mode, 40),
    keywords: Array.isArray(tool.keywords) ? tool.keywords.slice(0, 24).map((x) => safeString(x, 80)) : [],
    nextTools: Array.isArray(tool.nextTools) ? tool.nextTools.slice(0, 8).map((x) => safeString(x, 80)) : []
  })).filter((tool) => tool.slug && tool.label);
}

function normalizeLocalPlan(plan) {
  if (!plan || typeof plan !== "object") return null;
  return {
    confidence: clampNumber(plan.confidence, 0, 1, 0),
    steps: Array.isArray(plan.steps)
      ? plan.steps.slice(0, 6).map((step) => ({
        tool: safeString(step.tool, 80),
        label: safeString(step.label, 120),
        confidence: clampNumber(step.confidence, 0, 1, 0)
      }))
      : []
  };
}

function parseBody(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (Buffer.byteLength(String(raw), "utf8") > MAX_BODY_BYTES) {
    const err = new Error("Body too large");
    err.status = 413;
    throw err;
  }
  return JSON.parse(String(raw));
}

function checkOrigin(headers = {}, env = process.env) {
  if (env.CLAWBUIS_ALLOW_ANY_ORIGIN === "1") return true;
  const origin = headers.origin || headers.Origin || "";
  const referer = headers.referer || headers.Referer || "";
  if (origin && ALLOWED_ORIGINS.has(origin)) return true;
  if (referer) {
    for (const allowed of ALLOWED_ORIGINS) {
      if (referer.startsWith(allowed)) return true;
    }
  }
  return !origin && !referer;
}

function getIp(headers = {}) {
  const xff = headers["x-forwarded-for"] || headers["X-Forwarded-For"] || "";
  if (xff) return String(xff).split(",")[0].trim();
  return headers["x-real-ip"] || headers["X-Real-IP"] || "local";
}

function rateLimitOk(ip) {
  const now = Date.now();
  const current = buckets.get(ip) || [];
  const fresh = current.filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT) {
    buckets.set(ip, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(ip, fresh);
  return true;
}

function buildSystemPrompt(tools) {
  return `Du bist CLAWBUIS Tools Concierge. Deine Aufgabe ist NICHT Chatten, sondern aus einem deutschen Nutzerziel einen sicheren, editierbaren Workflow fuer lokale Browser-Tools zu bauen.

REGELN
- Antworte nur als strict JSON.
- Nutze ausschliesslich Slugs aus der Tool-Liste.
- Plane sinnvolle Reihenfolge, z.B. unterschreiben -> OCR -> komprimieren, wenn der Nutzer das so sagt.
- Eindeutiges als add_step mit confidence >= 0.85.
- Abgeleitetes als add_step mit confidence 0.7-0.84.
- Unsicheres nicht erraten: frage mit ask.
- Kein Dateicontent liegt vor. Du bekommst nur Dateiarten, niemals Dateien.
- Wenn Nutzer "runter machen", "kleiner", "zu gross", "E-Mail" sagt, meint er meistens komprimieren. Dateiart entscheidet PDF/Bild/Video.
- Wenn Nutzer "auslesen", "rauslesen", "durchsuchbar", "Text erkennen" sagt, ist es OCR fuer PDF/Scan.
- Wenn mehrere Dateiarten moeglich sind und keine Dateiart/Mappe-Klarheit existiert: ask.
- Keine Bezahl-, Konto-, Zahlungsdaten, Secrets oder private Dateiinhalte anfordern.

TOOL-LISTE
${JSON.stringify(tools)}

ANTWORTFORMAT
{
  "message": "<kurz, 1 Satz, was du baust oder warum du fragst>",
  "confidence": 0.0,
  "actions": [
    {
      "action": "add_step",
      "tool": "<slug>",
      "confidence": 0.0,
      "reason": "<kurzer Grund aus User-Ziel>",
      "filePolicy": "matching_files|needs_file|no_file"
    }
  ],
  "questions": [
    { "question": "<kurze Rueckfrage>", "options": ["<Option>", "<Option>"] }
  ]
}`;
}

function buildGeminiBody(payload) {
  const intent = safeString(payload.intent, MAX_INTENT_CHARS);
  const files = normalizeFiles(payload.files);
  const tools = normalizeTools(payload.tools);
  const localPlan = normalizeLocalPlan(payload.localPlan);

  if (intent.length < 2) {
    const err = new Error("Intent too short");
    err.status = 400;
    throw err;
  }
  if (tools.length === 0) {
    const err = new Error("No tools provided");
    err.status = 400;
    throw err;
  }

  const userPayload = {
    intent,
    fileContext: files,
    localRouterDraft: localPlan,
    instruction: "Baue daraus einen Workflow. Wenn der lokale Draft gut ist, uebernimm ihn. Wenn er falsch ist, korrigiere ihn."
  };

  return {
    systemInstruction: { parts: [{ text: buildSystemPrompt(tools) }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(userPayload) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.15,
      maxOutputTokens: 900,
      responseSchema: {
        type: "object",
        properties: {
          message: { type: "string" },
          confidence: { type: "number" },
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["add_step", "ask"] },
                tool: { type: "string" },
                confidence: { type: "number" },
                reason: { type: "string" },
                filePolicy: { type: "string" }
              },
              required: ["action"]
            }
          },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } }
              }
            }
          }
        },
        required: ["message", "confidence", "actions", "questions"]
      }
    }
  };
}

function parseGeminiText(data) {
  const text = data && data.candidates && data.candidates[0] &&
    data.candidates[0].content && data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
  const raw = safeString(text || "{}", 8000)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```\s*$/i, "");
  const parsed = JSON.parse(raw || "{}");
  return {
    message: safeString(parsed.message || "Ich habe einen Workflow-Entwurf gebaut.", 240),
    confidence: clampNumber(parsed.confidence, 0, 1, 0.72),
    actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 6).map((action) => ({
      action: safeString(action.action, 32),
      tool: safeString(action.tool, 80),
      confidence: clampNumber(action.confidence, 0, 1, 0.72),
      reason: safeString(action.reason, 180),
      filePolicy: safeString(action.filePolicy || "matching_files", 32)
    })) : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3).map((q) => ({
      question: safeString(q.question, 240),
      options: Array.isArray(q.options) ? q.options.slice(0, 4).map((x) => safeString(x, 80)) : []
    })).filter((q) => q.question) : []
  };
}

async function handlePlanRequest(rawBody, headers = {}, env = process.env) {
  if (!checkOrigin(headers, env)) return fail(403, "Origin not allowed");
  const ip = getIp(headers);
  if (!rateLimitOk(ip)) return fail(429, "Rate limit exceeded");

  const apiKey = getApiKey(env);
  if (!apiKey) {
    return json(200, { ok: false, error: { message: "GEMINI_API_KEY missing" }, fallback: "local-router" });
  }

  let payload;
  try {
    payload = parseBody(rawBody);
  } catch (err) {
    return fail(err.status || 400, err.message || "Invalid JSON");
  }

  let geminiBody;
  try {
    geminiBody = buildGeminiBody(payload || {});
  } catch (err) {
    return fail(err.status || 400, err.message);
  }

  const model = getModel(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(geminiBody),
        signal: controller.signal
      }
    );
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data && data.error && data.error.message ? data.error.message : `Gemini ${upstream.status}`;
      return json(200, { ok: false, error: { message }, fallback: "local-router" });
    }
    const plan = parseGeminiText(data);
    return json(200, {
      ok: true,
      source: "gemini-flash",
      model,
      plan,
      usageMetadata: data.usageMetadata || null,
      privacy: getStatus(env).privacy
    });
  } catch (err) {
    const message = err && err.name === "AbortError" ? "Gemini timeout" : (err && err.message) || "Gemini failed";
    return json(200, { ok: false, error: { message }, fallback: "local-router" });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  MAX_BODY_BYTES,
  getStatus,
  handlePlanRequest,
  json,
  fail
};
