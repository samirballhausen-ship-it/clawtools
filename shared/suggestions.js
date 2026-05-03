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
  // Custom Type-Glyph SVGs — kein Emoji, kein Lucide-default.
  // Hand-gezeichneter Charakter mit Office-NG-Akzent (emerald).
  // ────────────────────────────────────────────────
  const TYPE_GLYPH_SVG = {
    pdf: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M 8 6 L 8 26 Q 8 27 9 27 L 22 27 Q 23 27 23 26 L 23 12 L 18 6 Z"/>
      <path d="M 18 6 L 18 12 L 23 12"/>
      <path d="M 10 8 L 25 8 L 25 28" stroke-dasharray="2 3" opacity="0.32"/>
      <line x1="11" y1="17" x2="19" y2="17"/>
      <line x1="11" y1="20" x2="20" y2="20"/>
      <line x1="11" y1="23" x2="16" y2="23"/>
      <circle cx="20" cy="23" r="0.9" fill="#15803d" stroke="none"/>
    </svg>`,
    image: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="5" y="7" width="22" height="18" rx="1.5"/>
      <circle cx="11" cy="13" r="1.8" fill="#15803d" stroke="none"/>
      <path d="M 6 22 L 12 17 L 16 20 L 21 15 L 26 19"/>
      <path d="M 26 19 L 26 25"/>
    </svg>`,
    heic: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="10" y="3" width="12" height="26" rx="2"/>
      <line x1="14" y1="5" x2="18" y2="5" stroke-width="1.6"/>
      <rect x="12" y="8" width="8" height="16" rx="0.5" opacity="0.45"/>
      <circle cx="14.5" cy="11" r="0.9" fill="#15803d" stroke="none"/>
      <path d="M 13 19 L 15 17 L 17 18 L 19 16" opacity="0.7"/>
      <circle cx="16" cy="26.5" r="0.9"/>
    </svg>`,
    sheet: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="5" y="6" width="22" height="20" rx="1"/>
      <line x1="5" y1="12" x2="27" y2="12"/>
      <line x1="5" y1="19" x2="27" y2="19"/>
      <line x1="13" y1="6" x2="13" y2="26"/>
      <line x1="20" y1="6" x2="20" y2="26"/>
      <rect x="5.5" y="6.5" width="7.5" height="5.5" fill="#15803d" opacity="0.08" stroke="none"/>
    </svg>`,
    docx: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M 8 5 L 8 27 Q 8 28 9 28 L 23 28 Q 24 28 24 27 L 24 11 L 18 5 Z"/>
      <path d="M 18 5 L 18 11 L 24 11"/>
      <line x1="11" y1="16" x2="21" y2="16"/>
      <line x1="11" y1="19" x2="21" y2="19"/>
      <line x1="11" y1="22" x2="18" y2="22"/>
      <line x1="11" y1="25" x2="15" y2="25" stroke="#15803d" stroke-width="1.8"/>
    </svg>`,
    video: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="9" width="20" height="14" rx="1.5"/>
      <polygon points="29,10 23,14 23,18 29,22"/>
      <circle cx="9" cy="16" r="0.9" fill="#15803d" stroke="none"/>
      <line x1="13" y1="14" x2="19" y2="14" opacity="0.4"/>
      <line x1="13" y1="18" x2="17" y2="18" opacity="0.4"/>
    </svg>`,
    other: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M 5 11 L 16 5 L 27 11 L 27 23 L 16 29 L 5 23 Z"/>
      <path d="M 5 11 L 16 17 L 27 11"/>
      <line x1="16" y1="17" x2="16" y2="29"/>
      <circle cx="16" cy="11" r="1" fill="#15803d" stroke="none"/>
    </svg>`
  };

  // ────────────────────────────────────────────────
  // Type Meta (Visual + Sprache) — emoji-Feld bleibt für Backwards-Compat
  // (mappe-grouped.js liest preferiert glyphSvg, fallback emoji)
  // ────────────────────────────────────────────────
  const TYPE_META = {
    pdf:   { glyphSvg: TYPE_GLYPH_SVG.pdf,   label: 'PDFs',          singular: 'PDF',          plural: 'PDFs',          accent: '#0a0a0a', glow: 'rgba(10,10,10,.10)', order: 1 },
    image: { glyphSvg: TYPE_GLYPH_SVG.image, label: 'Bilder',        singular: 'Bild',         plural: 'Bilder',        accent: '#0a0a0a', glow: 'rgba(10,10,10,.10)', order: 2 },
    heic:  { glyphSvg: TYPE_GLYPH_SVG.heic,  label: 'iPhone-Fotos',  singular: 'iPhone-Foto',  plural: 'iPhone-Fotos',  accent: '#0a0a0a', glow: 'rgba(10,10,10,.10)', order: 3 },
    sheet: { glyphSvg: TYPE_GLYPH_SVG.sheet, label: 'Tabellen',      singular: 'Tabelle',      plural: 'Tabellen',      accent: '#0a0a0a', glow: 'rgba(10,10,10,.10)', order: 4 },
    docx:  { glyphSvg: TYPE_GLYPH_SVG.docx,  label: 'Word-Dateien',  singular: 'Word-Datei',   plural: 'Word-Dateien',  accent: '#0a0a0a', glow: 'rgba(10,10,10,.10)', order: 5 },
    video: { glyphSvg: TYPE_GLYPH_SVG.video, label: 'Videos',        singular: 'Video',        plural: 'Videos',        accent: '#0a0a0a', glow: 'rgba(10,10,10,.10)', order: 6 },
    other: { glyphSvg: TYPE_GLYPH_SVG.other, label: 'Weitere',       singular: 'Datei',        plural: 'Dateien',       accent: '#0a0a0a', glow: 'rgba(10,10,10,.10)', order: 9 }
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
