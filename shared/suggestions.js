/* CLAWBUIS Tools — Smart Suggestions Engine
 *
 * Type-Detection + Suggestion-Mapping. Pro Datei-Typ-Gruppe gibt es
 * eine Liste sinnvoller nächster Schritte — primäre Aktion zuerst,
 * sekundäre als Pills darunter.
 *
 * Public API (window.Suggestions):
 *   getTypeKey(file)        → 'pdf'|'image'|'heic'|'sheet'|'docx'|'video'|'other'
 *   groupByType(files)      → { pdf: [...], image: [...], ... } — Erhaltungs-Reihenfolge
 *   getTypeMeta(typeKey)    → { emoji, label, color, plural }
 *   getSuggestionsFor(typeKey, files) → [{ primary, tool, text, icon, fileIds }]
 *   prettyToolName(slug)    → User-friendly Tool-Name
 */
(function (global) {
  'use strict';

  // ────────────────────────────────────────────────
  // Type-Detection — Endbenutzer-Sprache, keine Tech-Begriffe
  // ────────────────────────────────────────────────
  function getTypeKey(file) {
    const t = (file.type || '').toLowerCase();
    const n = (file.name || '').toLowerCase();
    if (t === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf';
    if (t === 'image/heic' || t === 'image/heif' || /\.(heic|heif)$/.test(n)) return 'heic';
    if (t.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|tiff|tif|bmp|svg)$/.test(n)) return 'image';
    if (t.includes('csv') || t.includes('spreadsheet') || t.includes('excel') || t === 'text/csv' || /\.(csv|xlsx|xls|ods)$/.test(n)) return 'sheet';
    if (t.includes('word') || t.includes('opendocument.text') || /\.(docx|doc|odt)$/.test(n)) return 'docx';
    if (t.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|m4v)$/.test(n)) return 'video';
    return 'other';
  }

  // Group files by type — returns Map-like object preserving insertion order
  // of types as they appear in the files array (most-recent-first when caller sorts so)
  function groupByType(files) {
    const groups = {};
    for (const f of files) {
      const key = getTypeKey(f);
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    }
    return groups;
  }

  // ────────────────────────────────────────────────
  // Type Meta (Visual + Sprache)
  // ────────────────────────────────────────────────
  const TYPE_META = {
    pdf:   { emoji: '📄',  label: 'PDFs',          singular: 'PDF',          plural: 'PDFs',          accent: '#e11d48', glow: 'rgba(225,29,72,.18)',  order: 1 },
    image: { emoji: '🖼',  label: 'Bilder',        singular: 'Bild',         plural: 'Bilder',        accent: '#2dd4bf', glow: 'rgba(45,212,191,.18)',  order: 2 },
    heic:  { emoji: '📱', label: 'iPhone-Fotos', singular: 'iPhone-Foto',  plural: 'iPhone-Fotos',  accent: '#a78bfa', glow: 'rgba(167,139,250,.18)', order: 3 },
    sheet: { emoji: '📊', label: 'Tabellen',     singular: 'Tabelle',      plural: 'Tabellen',      accent: '#c29b62', glow: 'rgba(194,155,98,.20)',  order: 4 },
    docx:  { emoji: '📝', label: 'Word-Dateien', singular: 'Word-Datei',   plural: 'Word-Dateien',  accent: '#3b82f6', glow: 'rgba(59,130,246,.18)',  order: 5 },
    video: { emoji: '🎬', label: 'Videos',       singular: 'Video',        plural: 'Videos',        accent: '#ec4899', glow: 'rgba(236,72,153,.18)',  order: 6 },
    other: { emoji: '📦', label: 'Weitere',      singular: 'Datei',        plural: 'Dateien',       accent: '#71717a', glow: 'rgba(113,113,122,.18)', order: 9 }
  };

  function getTypeMeta(typeKey) {
    return TYPE_META[typeKey] || TYPE_META.other;
  }

  // ────────────────────────────────────────────────
  // Suggestion Rules — pro Typ, ordered by relevance
  // primary: true → wird hervorgehoben (Hero-CTA)
  // text kann String sein oder Function ({n, files}) → String
  // ────────────────────────────────────────────────
  const SUGGESTION_RULES = [
    // ─── PDFs ───
    { type: 'pdf', minCount: 2, primary: true, tool: 'pdf-merger',
      text: ({ n }) => `Diese ${n} PDFs zu einem zusammenfügen`,
      icon: 'merge', emoji: '🔗' },
    { type: 'pdf', minCount: 1, tool: 'pdf-compress',
      text: 'Kleiner machen für E-Mail',
      icon: 'compress', emoji: '🗜' },
    { type: 'pdf', minCount: 1, tool: 'pdf-to-word',
      text: 'In Word umwandeln',
      icon: 'word', emoji: '📝' },
    { type: 'pdf', minCount: 1, tool: 'pdf-splitter',
      text: 'In Einzelseiten zerlegen',
      icon: 'split', emoji: '✂️' },
    { type: 'pdf', minCount: 1, tool: 'pdf-redact',
      text: 'Stellen schwärzen',
      icon: 'redact', emoji: '⬛' },
    { type: 'pdf', minCount: 1, tool: 'pdf-watermark',
      text: 'Wasserzeichen aufdrücken',
      icon: 'watermark', emoji: '💧' },
    { type: 'pdf', minCount: 1, tool: 'pdf-sign',
      text: 'Unterschreiben',
      icon: 'sign', emoji: '✍️' },
    { type: 'pdf', minCount: 1, tool: 'pdf-ocr',
      text: 'Scan durchsuchbar machen',
      icon: 'ocr', emoji: '🔍' },

    // ─── HEIC (iPhone-Fotos) ───
    { type: 'heic', minCount: 1, primary: true, tool: 'heic-zu-jpg',
      text: ({ n }) => n === 1 ? 'In normales Bild umwandeln' : `${n} iPhone-Fotos in JPG umwandeln`,
      icon: 'convert', emoji: '🔄' },

    // ─── Images ───
    { type: 'image', minCount: 2, primary: true, tool: 'images-to-pdf',
      text: ({ n }) => `${n} Bilder zu einem PDF zusammenfassen`,
      icon: 'pdfize', emoji: '📑' },
    { type: 'image', minCount: 1, tool: 'images-compress',
      text: 'Bilder kleiner machen',
      icon: 'compress', emoji: '🗜' },
    { type: 'image', minCount: 1, tool: 'bg-remove',
      text: 'Hintergrund entfernen',
      icon: 'cutout', emoji: '✂️' },
    { type: 'image', minCount: 1, tool: 'exif-strip',
      text: 'Foto-Daten (Standort, Kamera) entfernen',
      icon: 'shield', emoji: '🛡' },
    { type: 'image', minCount: 2, tool: 'exif-rename',
      text: 'Nach Aufnahmedatum umbenennen',
      icon: 'rename', emoji: '🏷' },
    { type: 'image', minCount: 1, tool: 'images-to-pdf',
      // Wenn nur 1 Bild — trotzdem PDF anbieten als Alternative
      condition: (files) => files.length === 1,
      text: 'Bild als PDF speichern',
      icon: 'pdfize', emoji: '📑' },

    // ─── Sheets (CSV, Excel) ───
    { type: 'sheet', minCount: 1, primary: true, tool: 'csv-edit',
      text: 'Tabelle aufräumen und säubern',
      icon: 'tidy', emoji: '🧹' },

    // ─── DOCX (Word) ───
    { type: 'docx', minCount: 1, primary: true, tool: 'docx-zu-pdf',
      text: 'In PDF umwandeln',
      icon: 'pdfize', emoji: '📄' },

    // ─── Videos ───
    { type: 'video', minCount: 1, primary: true, tool: 'video-compress',
      text: 'Video kleiner machen',
      icon: 'compress', emoji: '🗜' },
    { type: 'video', minCount: 1, tool: 'video-zu-gif',
      text: 'In GIF umwandeln',
      icon: 'gif', emoji: '🎞' }
  ];

  function getSuggestionsFor(typeKey, files) {
    if (!files || files.length === 0) return [];
    const result = [];
    for (const rule of SUGGESTION_RULES) {
      if (rule.type !== typeKey) continue;
      if (files.length < rule.minCount) continue;
      if (rule.condition && !rule.condition(files)) continue;
      // Skip duplicate tool entries (e.g. images-to-pdf for 1 vs 2 images)
      if (result.some(r => r.tool === rule.tool)) continue;

      const text = typeof rule.text === 'function' ? rule.text({ n: files.length, files }) : rule.text;
      result.push({
        primary: !!rule.primary,
        tool: rule.tool,
        text,
        icon: rule.icon,
        emoji: rule.emoji,
        fileIds: files.map(f => f.id),
        fileCount: files.length
      });
    }
    // Wenn keine Suggestion als primary markiert ist, befördere die erste —
    // jede Gruppe braucht eine Hero-Aktion damit User nicht ratlos zwischen
    // 5 gleichwertigen Pills steht.
    if (result.length > 0 && !result.some(s => s.primary)) {
      result[0].primary = true;
    }
    return result;
  }

  // ────────────────────────────────────────────────
  // Pretty Tool-Name (Endbenutzer-Sprache, keine Tech-Begriffe)
  // ────────────────────────────────────────────────
  const TOOL_NAMES = {
    'pdf-merger': 'PDFs zusammenfügen',
    'pdf-splitter': 'PDF zerlegen',
    'pdf-redact': 'PDF schwärzen',
    'pdf-to-word': 'PDF in Word',
    'pdf-compress': 'PDF kleiner machen',
    'pdf-watermark': 'PDF Wasserzeichen',
    'pdf-sign': 'PDF unterschreiben',
    'pdf-ocr': 'PDF durchsuchbar machen',
    'images-compress': 'Bilder verkleinern',
    'images-to-pdf': 'Bilder zu PDF',
    'heic-zu-jpg': 'iPhone-Fotos umwandeln',
    'exif-strip': 'Foto-Daten entfernen',
    'exif-rename': 'Fotos umbenennen',
    'docx-zu-pdf': 'Word zu PDF',
    'video-compress': 'Video kleiner',
    'video-zu-gif': 'Video zu GIF',
    'bg-remove': 'Hintergrund entfernen',
    'csv-edit': 'Tabelle aufräumen'
  };

  function prettyToolName(slug) {
    return TOOL_NAMES[slug] || slug;
  }

  // ────────────────────────────────────────────────
  // Type-Order für gruppierten Render
  // ────────────────────────────────────────────────
  function sortGroupKeys(keys) {
    return [...keys].sort((a, b) => {
      const oa = (TYPE_META[a] || TYPE_META.other).order;
      const ob = (TYPE_META[b] || TYPE_META.other).order;
      return oa - ob;
    });
  }

  global.Suggestions = {
    getTypeKey,
    groupByType,
    getTypeMeta,
    getSuggestionsFor,
    prettyToolName,
    sortGroupKeys,
    TOOL_NAMES,
    TYPE_META
  };
})(window);
