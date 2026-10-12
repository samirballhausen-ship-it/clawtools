(function (global) {
  "use strict";

  const STATUS_URL = "/api/concierge/status";
  const PLAN_URL = "/api/concierge/plan";
  let statusPromise = null;

  function normalize(value) {
    if (global.WorkflowRouter && typeof global.WorkflowRouter.normalize === "function") {
      return global.WorkflowRouter.normalize(value);
    }
    return String(value || "").toLowerCase().trim();
  }

  function fileKind(file) {
    const type = String(file.type || "");
    const name = String(file.name || "").toLowerCase();
    if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.includes("sheet") || type.includes("excel") || /\.(csv|xlsx|xls)$/i.test(name)) return "sheet";
    if (type.includes("word") || /\.(docx|doc)$/i.test(name)) return "doc";
    return "file";
  }

  function fileExt(name) {
    const match = String(name || "").toLowerCase().match(/\.([a-z0-9]{1,8})$/);
    return match ? match[1] : "";
  }

  function sizeBucket(size) {
    const n = Number(size || 0);
    if (n <= 0) return "unknown";
    if (n < 512 * 1024) return "small";
    if (n < 5 * 1024 * 1024) return "medium";
    if (n < 30 * 1024 * 1024) return "large";
    return "huge";
  }

  function sanitizeFiles(files) {
    return (Array.isArray(files) ? files : []).slice(0, 24).map((file, index) => ({
      id: String(file.id || `file_${index}`),
      kind: fileKind(file),
      type: String(file.type || ""),
      ext: fileExt(file.name),
      sizeBucket: sizeBucket(file.size)
    }));
  }

  function serializeTools(registry) {
    return Object.entries(registry || {}).map(([slug, cfg]) => ({
      slug,
      label: cfg.label,
      problem: cfg.problem,
      accepts: cfg.accepts || [],
      outputs: cfg.outputs || [],
      mode: cfg.mode || "",
      keywords: cfg.keywords || [],
      nextTools: cfg.nextTools || []
    }));
  }

  function getStatus() {
    if (statusPromise) return statusPromise;
    statusPromise = fetch(STATUS_URL, { headers: { "accept": "application/json" } })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("status unavailable")))
      .catch(() => ({
        ok: false,
        provider: "local",
        model: "local-rule-router",
        keyConfigured: false,
        keyExposedToBrowser: false,
        privacy: { sendsFileContent: false, sendsFileNames: false, sendsIntentText: false }
      }));
    return statusPromise;
  }

  function matchingFileIds(tool, files, MappeApi) {
    const cfg = tool && tool.cfg ? tool.cfg : tool;
    const accepts = (cfg && cfg.accepts) || [];
    if (!accepts.length) return [];
    if (global.WorkflowRouter && typeof global.WorkflowRouter.matchingFiles === "function") {
      return global.WorkflowRouter.matchingFiles(files, accepts, MappeApi).map((file) => file.id);
    }
    if (accepts.includes("*/*")) return files.map((file) => file.id);
    return files.filter((file) => accepts.some((pattern) => {
      if (pattern.endsWith("/*")) return String(file.type || "").startsWith(pattern.slice(0, -1));
      return String(file.type || "") === pattern;
    })).map((file) => file.id);
  }

  function buildLocalPlan(intent, files, opts) {
    if (global.WorkflowRouter && typeof global.WorkflowRouter.buildPlan === "function") {
      return global.WorkflowRouter.buildPlan(intent, files, opts);
    }
    return {
      id: `wf_${Date.now()}`,
      source: "local-empty",
      localOnly: true,
      rawIntent: intent,
      normalizedIntent: normalize(intent),
      confidence: 0,
      status: "draft",
      summary: "Noch kein Router geladen.",
      steps: [],
      questions: [{ type: "clarify", text: "Router wird noch geladen. Versuch es gleich nochmal." }],
      unmatched: [intent]
    };
  }

  function geminiStepToWorkflowStep(action, registry, files, MappeApi, index) {
    if (!action || action.action !== "add_step") return null;
    const tool = String(action.tool || "");
    const cfg = registry[tool];
    if (!cfg) return null;
    const ids = matchingFileIds(cfg, files, MappeApi);
    const confidence = Math.max(0.35, Math.min(0.99, Number(action.confidence || 0.72)));
    return {
      id: `ai_${Date.now()}_${index}_${tool}`,
      tool,
      label: cfg.label,
      shortLabel: cfg.shortLabel || cfg.label,
      problem: cfg.problem,
      confidence: Number(confidence.toFixed(2)),
      reason: action.reason || "Gemini Flash hat diesen Schritt erkannt.",
      fileIds: ids,
      requiresChoice: cfg.mode === "single" && ids.length > 1,
      requiresFile: (cfg.accepts || []).length > 0 && ids.length === 0,
      source: "gemini-flash-router"
    };
  }

  function mergeGeminiPlan(localPlan, aiPayload, registry, files, MappeApi) {
    const actions = aiPayload && aiPayload.plan && Array.isArray(aiPayload.plan.actions)
      ? aiPayload.plan.actions
      : [];
    const seen = new Set();
    const steps = actions
      .map((action, index) => geminiStepToWorkflowStep(action, registry, files, MappeApi, index))
      .filter(Boolean)
      .filter((step) => {
        if (seen.has(step.tool)) return false;
        seen.add(step.tool);
        return true;
      });

    if (!steps.length) {
      const fallback = JSON.parse(JSON.stringify(localPlan));
      fallback.aiError = "Gemini returned no valid workflow steps.";
      fallback.source = "local-rule-router";
      fallback.localOnly = true;
      return fallback;
    }

    const questions = [];
    if (aiPayload.plan && Array.isArray(aiPayload.plan.questions)) {
      aiPayload.plan.questions.forEach((q) => {
        if (!q || !q.question) return;
        questions.push({ type: "ask", text: q.question, options: q.options || [] });
      });
    }

    return {
      id: `wf_ai_${Date.now()}`,
      source: "gemini-flash-router",
      localOnly: false,
      rawIntent: localPlan.rawIntent,
      normalizedIntent: localPlan.normalizedIntent,
      confidence: Number(Math.max(0.35, Math.min(0.99, aiPayload.plan.confidence || 0.76)).toFixed(2)),
      status: "draft",
      summary: steps.length === 1
        ? "Gemini Flash hat einen naechsten Schritt gebaut."
        : `Gemini Flash hat einen Workflow mit ${steps.length} Schritten gebaut.`,
      assistantMessage: aiPayload.plan.message || "",
      steps,
      questions,
      unmatched: [],
      usageMetadata: aiPayload.usageMetadata || null,
      privacy: aiPayload.privacy || null
    };
  }

  async function buildPlan(intent, files, opts = {}) {
    const registry = opts.registry || global.CLAWBUIS_WORKFLOW_REGISTRY || {};
    const allFiles = Array.isArray(files) ? files : [];
    const localPlan = buildLocalPlan(intent, allFiles, opts);
    const rawIntent = String(intent || "").trim();
    if (rawIntent.length < 2 || opts.ai === false) return localPlan;

    try {
      const status = await getStatus();
      if (!status || !status.keyConfigured) {
        localPlan.aiError = status && status.ok === false ? "Concierge API unavailable" : "GEMINI_API_KEY missing";
        return localPlan;
      }
      const body = {
        intent: rawIntent,
        files: sanitizeFiles(allFiles),
        tools: serializeTools(registry),
        localPlan
      };
      const res = await fetch(PLAN_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`Concierge API ${res.status}`);
      const payload = await res.json();
      if (!payload || !payload.ok) throw new Error(payload?.error?.message || "Concierge failed");
      return mergeGeminiPlan(localPlan, payload, registry, allFiles, opts.Mappe);
    } catch (err) {
      localPlan.aiError = err.message || "Gemini unavailable";
      localPlan.source = "local-rule-router";
      localPlan.localOnly = true;
      return localPlan;
    }
  }

  global.WorkflowAgent = {
    buildPlan,
    getStatus,
    sanitizeFiles,
    serializeTools
  };
})(window);
