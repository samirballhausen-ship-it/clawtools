(function (global) {
  "use strict";

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/Ã¤/g, "ae")
      .replace(/Ã¶/g, "oe")
      .replace(/Ã¼/g, "ue")
      .replace(/ÃŸ/g, "ss")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s.-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function includesPhrase(text, phrase) {
    const p = normalize(phrase);
    if (!p) return false;
    if (text.includes(p)) return true;
    const collapsedText = text.replace(/\s+/g, "");
    const collapsedPhrase = p.replace(/\s+/g, "");
    return collapsedPhrase.length > 5 && collapsedText.includes(collapsedPhrase);
  }

  function keywordHits(text, keywords) {
    const hits = [];
    (keywords || []).forEach((keyword) => {
      if (includesPhrase(text, keyword)) hits.push(keyword);
    });
    return hits;
  }

  function firstKeywordPosition(text, keywords) {
    let pos = Number.POSITIVE_INFINITY;
    (keywords || []).forEach((keyword) => {
      const k = normalize(keyword);
      const idx = text.indexOf(k);
      if (idx >= 0 && idx < pos) pos = idx;
    });
    return Number.isFinite(pos) ? pos : 99999;
  }

  function fallbackTypeMatches(type, accepts) {
    if (!accepts || accepts.length === 0) return false;
    if (accepts.includes("*/*")) return true;
    return accepts.some((pattern) => {
      if (pattern.endsWith("/*")) return String(type || "").startsWith(pattern.slice(0, -1));
      return String(type || "") === pattern;
    });
  }

  function matchingFiles(files, accepts, MappeApi) {
    if (!accepts || accepts.length === 0) return [];
    if (accepts.includes("*/*")) return files.slice();
    return files.filter((file) => {
      if (MappeApi && typeof MappeApi.typeMatches === "function") {
        return MappeApi.typeMatches(file.type, accepts);
      }
      return fallbackTypeMatches(file.type, accepts);
    });
  }

  function inferFileContext(files) {
    const counts = { pdf: 0, image: 0, video: 0, sheet: 0, doc: 0, other: 0 };
    files.forEach((file) => {
      const type = String(file.type || "");
      const name = String(file.name || "").toLowerCase();
      if (type === "application/pdf" || name.endsWith(".pdf")) counts.pdf++;
      else if (type.startsWith("image/")) counts.image++;
      else if (type.startsWith("video/")) counts.video++;
      else if (type.includes("sheet") || type.includes("excel") || /\.(csv|xlsx|xls)$/i.test(name)) counts.sheet++;
      else if (type.includes("word") || /\.(docx|doc)$/i.test(name)) counts.doc++;
      else counts.other++;
    });
    return counts;
  }

  function toolFamily(slug) {
    if (slug.startsWith("pdf-")) return "pdf";
    if (slug.startsWith("images-") || slug === "bg-remove" || slug === "heic-zu-jpg" || slug === "exif-strip") return "image";
    if (slug.startsWith("video-")) return "video";
    if (slug === "csv-edit") return "sheet";
    if (slug === "docx-zu-pdf") return "doc";
    return "other";
  }

  function requestedFamilies(text) {
    const families = new Set();
    if (/\b(pdf|scan|dokument|vertrag|rechnung|brief|seite|seiten)\b/.test(text)) families.add("pdf");
    if (/\b(ocr|auslesen|rauslesen|herauslesen|durchsuchbar|unterschreib|unterschrift|signatur|signieren|schwaerz|schwarz|zensieren|wasserzeichen|zusammenfuegen|zusammenfugen|splitten)\b/.test(text)) families.add("pdf");
    if (/\b(bild|bilder|foto|fotos|jpg|jpeg|png|heic|heif|iphone|motiv)\b/.test(text)) families.add("image");
    if (/\b(video|mp4|clip|gif)\b/.test(text)) families.add("video");
    if (/\b(csv|excel|xlsx|tabelle|liste|listen)\b/.test(text)) families.add("sheet");
    if (/\b(word|docx)\b/.test(text)) families.add("doc");
    return families;
  }

  function buildQuestion(text, steps, files) {
    if (!text) return null;
    if (steps.length === 0) {
      return {
        type: "clarify",
        text: files.length
          ? "Ich sehe Dateien in deiner Mappe, aber das Ziel ist noch nicht eindeutig. Soll ich eher auslesen, kleiner machen, unterschreiben oder zusammenfuegen?"
          : "Beschreib kurz Ziel und Dateiart, dann baue ich dir den Workflow."
      };
    }
    const low = steps.find((step) => step.confidence < 0.72);
    if (low) {
      return {
        type: "confirm-step",
        text: `Bei "${low.label}" bin ich noch nicht ganz sicher. Du kannst den Schritt loeschen, verschieben oder trotzdem starten.`
      };
    }
    return null;
  }

  function scoreTool(slug, cfg, text, files, MappeApi) {
    const hits = keywordHits(text, cfg.keywords);
    const fileMatches = matchingFiles(files, cfg.accepts || [], MappeApi);
    const hasIntent = text.length > 1;
    const hasFiles = fileMatches.length > 0;
    const noFileTool = (cfg.accepts || []).length === 0;

    let score = cfg.priority || 0;
    score += hits.length * 42;
    if (hasFiles) score += 32 + Math.min(fileMatches.length * 8, 24);
    if (!hasIntent && !hasFiles && !noFileTool) score -= 160;
    if (hasIntent && hits.length === 0 && !hasFiles) score -= 110;
    if (hasIntent && hits.length === 0 && hasFiles) score -= 70;
    if (noFileTool && hits.length > 0) score += 24;
    if (slug === "pdf-ocr" && includesPhrase(text, "auslesen")) score += 36;
    if (slug === "pdf-compress" && includesPhrase(text, "runter")) score += 20;
    if (slug === "images-compress" && includesPhrase(text, "runter") && inferFileContext(files).image > 0) score += 24;
    if (slug === "video-compress" && includesPhrase(text, "runter") && inferFileContext(files).video > 0) score += 24;

    const confidence = Math.max(0.38, Math.min(0.98,
      0.46 + hits.length * 0.16 + (hasFiles ? 0.2 : 0) + (hits.length > 1 ? 0.08 : 0)
    ));

    return {
      slug,
      cfg,
      hits,
      score,
      confidence,
      order: firstKeywordPosition(text, cfg.keywords),
      fileIds: fileMatches.map((f) => f.id)
    };
  }

  function buildStep(match, index) {
    const cfg = match.cfg;
    const needsChoice = cfg.mode === "single" && match.fileIds.length > 1;
    const noFilesButNeeds = (cfg.accepts || []).length > 0 && match.fileIds.length === 0;
    return {
      id: `step_${Date.now()}_${index}_${match.slug}`,
      tool: match.slug,
      label: cfg.label,
      shortLabel: cfg.shortLabel || cfg.label,
      problem: cfg.problem,
      confidence: Number(match.confidence.toFixed(2)),
      reason: match.hits.length
        ? `Erkannt: ${match.hits.slice(0, 3).join(", ")}`
        : "Aus vorhandenen Dateien abgeleitet.",
      fileIds: match.fileIds,
      requiresChoice: needsChoice,
      requiresFile: noFilesButNeeds,
      source: "local-router"
    };
  }

  function textMentionsToolFamily(slug, text) {
    if (slug.startsWith("pdf-")) {
      return /\b(pdf|scan|dokument|vertrag|rechnung|brief|seite|seiten)\b/.test(text);
    }
    if (slug.startsWith("images-") || slug === "bg-remove" || slug === "heic-zu-jpg" || slug === "exif-strip") {
      return /\b(bild|bilder|foto|fotos|jpg|jpeg|png|heic|heif|iphone|motiv)\b/.test(text);
    }
    if (slug.startsWith("video-")) {
      return /\b(video|mp4|clip|gif)\b/.test(text);
    }
    if (slug === "csv-edit") {
      return /\b(csv|excel|xlsx|tabelle|liste|listen)\b/.test(text);
    }
    if (slug === "docx-zu-pdf") {
      return /\b(word|docx|dokument)\b/.test(text);
    }
    return true;
  }

  function summarizePlan(steps, text, files) {
    if (!text && files.length === 0) return "Wirf Dateien rein oder beschreib dein Ziel. Ich baue daraus einen Workflow.";
    if (steps.length === 0) return "Noch kein sicherer Workflow. Ich brauche Ziel oder passende Dateien.";
    if (steps.length === 1) return "Ich habe einen passenden naechsten Schritt erkannt.";
    return `Ich habe daraus einen Workflow mit ${steps.length} Schritten gebaut.`;
  }

  function buildPlan(intent, files, opts) {
    const registry = (opts && opts.registry) || global.CLAWBUIS_WORKFLOW_REGISTRY || {};
    const MappeApi = opts && opts.Mappe;
    const rawIntent = String(intent || "");
    const text = normalize(rawIntent);
    const allFiles = Array.isArray(files) ? files : [];
    const hasIntent = text.length > 1;
    const families = requestedFamilies(text);

    const matches = Object.entries(registry)
      .map(([slug, cfg]) => scoreTool(slug, cfg, text, allFiles, MappeApi))
      .filter((match) => {
        const needsFile = (match.cfg.accepts || []).length > 0;
        const hasMatchingFile = match.fileIds.length > 0;
        const hasAnyFiles = allFiles.length > 0;
        if (hasIntent && needsFile && families.size > 0 && !families.has(toolFamily(match.slug))) {
          return false;
        }
        if (hasIntent && needsFile && !hasMatchingFile && hasAnyFiles && !textMentionsToolFamily(match.slug, text)) {
          return false;
        }
        if (!hasIntent) return match.fileIds.length > 0 && match.score > 0;
        return match.hits.length > 0 || match.score >= 92;
      })
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return b.score - a.score;
      });

    const seen = new Set();
    const steps = [];
    matches.forEach((match) => {
      if (seen.has(match.slug)) return;
      if (steps.length >= 5) return;
      seen.add(match.slug);
      steps.push(buildStep(match, steps.length));
    });

    if (!hasIntent && steps.length > 0) {
      steps.sort((a, b) => (registry[b.tool].priority || 0) - (registry[a.tool].priority || 0));
    }

    const avg = steps.length
      ? steps.reduce((sum, step) => sum + step.confidence, 0) / steps.length
      : 0;
    const question = buildQuestion(text, steps, allFiles);

    return {
      id: `wf_${Date.now()}`,
      source: "local-rule-router",
      localOnly: true,
      rawIntent,
      normalizedIntent: text,
      confidence: Number(Math.min(0.98, avg || 0).toFixed(2)),
      status: "draft",
      summary: summarizePlan(steps, text, allFiles),
      steps,
      questions: question ? [question] : [],
      unmatched: hasIntent && steps.length === 0 ? [rawIntent] : []
    };
  }

  function clonePlan(plan) {
    return JSON.parse(JSON.stringify(plan || buildPlan("", [], {})));
  }

  global.WorkflowRouter = {
    buildPlan,
    clonePlan,
    normalize,
    matchingFiles
  };
})(window);
