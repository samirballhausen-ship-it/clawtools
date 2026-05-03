/* CLAWBUIS Tools — Smart Mappe Grouped View
 *
 * Rendert die Mappe nach Datei-Typ gruppiert, mit kontextuellen
 * Vorschlägen direkt unter jeder Gruppe. Ersetzt den flat library-grid
 * durch eine geführte UX, die den User an die Hand nimmt.
 *
 * Public API (window.MappeGrouped):
 *   render(container, files, opts) → void
 *
 * opts = {
 *   onSuggestionClick: (tool, fileIds, suggestion) => void,
 *   onFileRemove: (fileId) => Promise<void>,
 *   onGroupClick: (typeKey, files) => void   // optional, default: open mappe-modal
 * }
 *
 * Dependencies: window.Mappe, window.Suggestions, window.Shell
 * SAFETY: keine innerHTML, alle SVGs hardcoded.
 */
(function (global) {
  'use strict';

  const M = global.Mappe;
  const Sug = global.Suggestions;
  const S = global.Shell;
  if (!M || !Sug || !S) {
    console.warn('[mappe-grouped] dependencies missing');
    return;
  }

  // ────────────────────────────────────────────────
  // Hardcoded SVG Icons — anti-AI-slop, hand-crafted.
  // Pro Suggestion-Tool ein eigenes Icon mit subtilem Detail.
  // ────────────────────────────────────────────────
  const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  // Per-Tool-Icons — emerald accent line auf 1 Detail. NICHT lucide-default.
  const TOOL_ICON_SVG = {
    'pdf-merger': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 7 8 Q 7 16 16 16"/><path d="M 7 16 L 16 16"/><path d="M 7 24 Q 7 16 16 16"/><circle cx="7" cy="8" r="1.4"/><circle cx="7" cy="16" r="1.4"/><circle cx="7" cy="24" r="1.4"/><line x1="16" y1="16" x2="25" y2="16" stroke="#15803d" stroke-width="1.8"/><circle cx="25" cy="16" r="1.6" fill="#15803d" stroke="none"/></svg>`,
    'pdf-compress': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="11" y="11" width="10" height="10" rx="0.5" stroke="#15803d"/><path d="M 4 4 L 9 9"/><polyline points="9,4 9,9 4,9"/><path d="M 28 4 L 23 9"/><polyline points="23,4 23,9 28,9"/><path d="M 4 28 L 9 23"/><polyline points="4,23 9,23 9,28"/><path d="M 28 28 L 23 23"/><polyline points="23,28 23,23 28,23"/></svg>`,
    'pdf-to-word': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="7" width="11" height="18" rx="0.5"/><line x1="6" y1="12" x2="11" y2="12" opacity="0.5"/><line x1="6" y1="16" x2="11" y2="16" opacity="0.5"/><line x1="6" y1="20" x2="9" y2="20" opacity="0.5"/><path d="M 16 16 L 21 16" stroke-dasharray="2 2"/><polyline points="19,13 21,16 19,19" stroke="#15803d"/><rect x="22" y="7" width="7" height="18" rx="0.5" stroke="#15803d"/><line x1="24" y1="13" x2="27" y2="13"/><line x1="24" y1="17" x2="27" y2="17"/></svg>`,
    'pdf-splitter': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="6" width="10" height="14" rx="0.5"/><rect x="19" y="6" width="10" height="14" rx="0.5"/><line x1="13" y1="13" x2="19" y2="13" stroke-dasharray="1.5 1.5"/><path d="M 12 24 L 16 28 L 20 24" stroke="#15803d"/><line x1="16" y1="20" x2="16" y2="28" stroke="#15803d"/></svg>`,
    'pdf-redact': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 7 5 L 7 27 Q 7 28 8 28 L 24 28 Q 25 28 25 27 L 25 11 L 19 5 Z"/><path d="M 19 5 L 19 11 L 25 11"/><line x1="11" y1="14" x2="21" y2="14" stroke-dasharray="2 2"/><rect x="11" y="17" width="10" height="3" fill="currentColor" stroke="none"/><rect x="11" y="22" width="7" height="3" fill="#15803d" stroke="none"/></svg>`,
    'pdf-watermark': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 7 5 L 7 27 Q 7 28 8 28 L 24 28 Q 25 28 25 27 L 25 11 L 19 5 Z"/><path d="M 19 5 L 19 11 L 25 11"/><text x="16" y="22" text-anchor="middle" font-family="Geist Mono, monospace" font-size="6.5" font-weight="600" stroke="#15803d" stroke-width="0.4" fill="none" transform="rotate(-20, 16, 22)">DRAFT</text></svg>`,
    'pdf-sign': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 4 24 Q 8 18 12 22 T 20 22 Q 22 22 24 19" stroke="#15803d" stroke-width="1.8"/><path d="M 24 19 L 27 16" stroke="#15803d"/><line x1="3" y1="28" x2="29" y2="28" opacity="0.4"/></svg>`,
    'pdf-ocr': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="6" y1="9" x2="20" y2="9" stroke-dasharray="2 1.5"/><line x1="6" y1="14" x2="18" y2="14" stroke-dasharray="2 1.5"/><line x1="6" y1="19" x2="19" y2="19" stroke-dasharray="2 1.5"/><line x1="6" y1="24" x2="14" y2="24" stroke-dasharray="2 1.5"/><circle cx="22" cy="22" r="6" stroke="#15803d"/><line x1="26.5" y1="26.5" x2="29" y2="29" stroke="#15803d" stroke-width="1.7"/></svg>`,
    'heic-zu-jpg': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="6" width="10" height="20" rx="1.5"/><rect x="5" y="10" width="6" height="11" rx="0.5" opacity="0.4"/><circle cx="6.5" cy="12.5" r="0.7"/><path d="M 15 16 L 20 16" stroke-dasharray="2 2"/><polyline points="18,13 20,16 18,19" stroke="#15803d"/><rect x="21" y="6" width="8" height="20" rx="1" stroke="#15803d"/><text x="25" y="19" text-anchor="middle" font-family="Geist Mono, monospace" font-size="5.5" font-weight="700" fill="currentColor" stroke="none">JPG</text></svg>`,
    'images-compress': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="20" height="20" rx="0.5" opacity="0.35" stroke-dasharray="2 2"/><rect x="10" y="10" width="13" height="13" rx="0.5" stroke="#15803d"/><circle cx="13" cy="14" r="1"/><path d="M 10 21 L 14 18 L 16 19 L 19 16 L 23 19"/></svg>`,
    'images-to-pdf': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="7" width="9" height="11" rx="0.5" opacity="0.55"/><rect x="7" y="10" width="9" height="11" rx="0.5"/><path d="M 17 16 L 21 16" stroke-dasharray="2 2"/><polyline points="19,13 21,16 19,19"/><path d="M 23 7 L 23 25 Q 23 26 24 26 L 28 26 Q 29 26 29 25 L 29 11 L 25 7 Z" stroke="#15803d"/><path d="M 25 7 L 25 11 L 29 11" stroke="#15803d"/></svg>`,
    'exif-strip': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 16 4 L 7 8 L 7 15 Q 7 23 16 28 Q 25 23 25 15 L 25 8 Z"/><path d="M 12 15 L 15 18 L 21 12" stroke="#15803d" stroke-width="1.8"/><line x1="10" y1="22" x2="13" y2="22" opacity="0.4" stroke-dasharray="1.5 1.5"/><line x1="19" y1="22" x2="22" y2="22" opacity="0.4" stroke-dasharray="1.5 1.5"/></svg>`,
    'exif-rename': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="6" width="20" height="20" rx="1"/><line x1="3" y1="11" x2="23" y2="11"/><line x1="9" y1="6" x2="9" y2="11"/><circle cx="6" cy="8.5" r="0.6" fill="currentColor" stroke="none"/><line x1="6" y1="16" x2="20" y2="16" opacity="0.45"/><line x1="6" y1="20" x2="16" y2="20" opacity="0.45"/><path d="M 22 22 L 27 17" stroke="#15803d" stroke-width="1.7"/><polyline points="24,16 27,17 26,20" stroke="#15803d"/></svg>`,
    'docx-zu-pdf': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M 3 7 L 3 25 Q 3 26 4 26 L 12 26 Q 13 26 13 25 L 13 11 L 9 7 Z"/><path d="M 9 7 L 9 11 L 13 11"/><path d="M 15 16 L 20 16" stroke-dasharray="2 2"/><polyline points="18,13 20,16 18,19" stroke="#15803d"/><path d="M 22 7 L 22 25 Q 22 26 23 26 L 28 26 Q 29 26 29 25 L 29 11 L 25 7 Z" stroke="#15803d"/><path d="M 25 7 L 25 11 L 29 11" stroke="#15803d"/></svg>`,
    'video-compress': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="9" width="17" height="14" rx="1" opacity="0.4" stroke-dasharray="2 2"/><rect x="9" y="13" width="11" height="10" rx="1" stroke="#15803d"/><polygon points="29,9 22,13 22,19 29,23"/><polygon points="13,15 13,21 17,18" fill="currentColor" stroke="none" opacity="0.7"/></svg>`,
    'video-zu-gif': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="9" width="13" height="14" rx="1"/><polygon points="20,10 14,14 20,18" fill="currentColor" stroke="none" opacity="0.6"/><path d="M 17 16 L 21 16" stroke-dasharray="2 2"/><polyline points="19,13 21,16 19,19"/><rect x="22" y="9" width="7" height="14" rx="1" stroke="#15803d"/><text x="25.5" y="19" text-anchor="middle" font-family="Geist Mono, monospace" font-size="5" font-weight="700" fill="currentColor" stroke="none">GIF</text></svg>`,
    'bg-remove': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="0.5" stroke-dasharray="2 3" opacity="0.5"/><circle cx="16" cy="13" r="4"/><path d="M 8 26 Q 8 19 16 19 Q 24 19 24 26"/><circle cx="6" cy="8" r="0.7" fill="currentColor" stroke="none" opacity="0.45"/><circle cx="9" cy="6" r="0.5" fill="currentColor" stroke="none" opacity="0.35"/><circle cx="25" cy="9" r="0.7" fill="currentColor" stroke="none" opacity="0.45"/><circle cx="22" cy="22" r="1" fill="#15803d" stroke="none"/></svg>`,
    'csv-edit': `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="5" width="22" height="22" rx="0.5"/><line x1="3" y1="11" x2="25" y2="11"/><line x1="3" y1="17" x2="25" y2="17"/><line x1="3" y1="23" x2="25" y2="23"/><line x1="11" y1="5" x2="11" y2="27"/><line x1="19" y1="5" x2="19" y2="27"/><rect x="3.5" y="5.5" width="7.5" height="5.5" fill="#15803d" opacity="0.1" stroke="none"/><path d="M 22 25 L 27 20" stroke="#15803d" stroke-width="1.7"/></svg>`
  };

  const KIND_THUMB_ICONS = {
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    heic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>',
    sheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    docx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  };

  // ────────────────────────────────────────────────
  // Render Entry
  // ────────────────────────────────────────────────
  function render(container, files, opts) {
    opts = opts || {};
    while (container.firstChild) container.removeChild(container.firstChild);

    if (!files || files.length === 0) {
      const empty = S.el('div', {
        class: 'mg-empty',
        text: 'Noch keine Dateien — wirf welche oben rein, dann erscheinen hier deine Möglichkeiten.'
      });
      container.appendChild(empty);
      return;
    }

    const groups = Sug.groupByType(files);
    const orderedKeys = Sug.sortGroupKeys(Object.keys(groups));

    orderedKeys.forEach((typeKey, idx) => {
      const groupFiles = groups[typeKey];
      const card = buildGroupCard(typeKey, groupFiles, opts);
      // Stagger animation
      card.style.setProperty('--mg-stagger', String(idx));
      container.appendChild(card);
    });
  }

  // ────────────────────────────────────────────────
  // Group Card
  // ────────────────────────────────────────────────
  function buildGroupCard(typeKey, files, opts) {
    const meta = Sug.getTypeMeta(typeKey);
    const card = S.el('div', {
      class: 'mg-group',
      attrs: { 'data-type': typeKey }
    });
    card.style.setProperty('--mg-accent', meta.accent);
    card.style.setProperty('--mg-glow', meta.glow);

    // ─── Header ─── Custom-SVG-Glyph statt Emoji
    const head = S.el('div', { class: 'mg-group-head' });
    const glyph = S.el('span', { class: 'mg-group-glyph', attrs: { 'aria-hidden': 'true' } });
    if (meta.glyphSvg) {
      glyph.appendChild(S.parseSVG(meta.glyphSvg));
    } else if (meta.emoji) {
      // Fallback für alte Type-Meta ohne glyphSvg
      glyph.textContent = meta.emoji;
    }
    const titleWrap = S.el('div', { class: 'mg-group-title-wrap' });
    const title = S.el('h3', { class: 'mg-group-title', text: meta.label });
    const countLabel = files.length === 1 ? `1 ${meta.singular}` : `${files.length} ${meta.plural}`;
    const sub = S.el('span', { class: 'mg-group-count', text: countLabel });
    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);
    head.appendChild(glyph);
    head.appendChild(titleWrap);
    card.appendChild(head);

    // ─── Files-Row (max 4 visible, Rest als "+N" Indikator) ───
    const FILES_VISIBLE = 4;
    const filesRow = S.el('div', { class: 'mg-files' });
    const visibleFiles = files.slice(0, FILES_VISIBLE);
    visibleFiles.forEach((f) => filesRow.appendChild(buildFileChip(f, typeKey, opts)));
    if (files.length > FILES_VISIBLE) {
      const moreFiles = files.length - FILES_VISIBLE;
      const more = S.el('button', {
        class: 'mg-files-more',
        attrs: { type: 'button', 'aria-label': `${moreFiles} weitere anzeigen` },
        on: {
          click: () => {
            // Expand: append remaining files inline
            files.slice(FILES_VISIBLE).forEach(f => filesRow.insertBefore(buildFileChip(f, typeKey, opts), more));
            more.remove();
          }
        }
      });
      more.appendChild(S.el('span', { class: 'mg-files-more-text', text: `+ ${moreFiles} weitere` }));
      filesRow.appendChild(more);
    }
    card.appendChild(filesRow);

    // ─── Suggestions (Primary + max 4 sichtbare Sekundär-Pills, Rest hinter "Mehr…") ───
    const suggestions = Sug.getSuggestionsFor(typeKey, files);
    if (suggestions.length > 0) {
      const PILLS_VISIBLE = 4;
      const sugWrap = S.el('div', { class: 'mg-suggestions' });
      const primary = suggestions.find(s => s.primary);
      const secondary = suggestions.filter(s => !s.primary);

      if (primary) {
        sugWrap.appendChild(buildPrimaryCTA(primary, opts));
      }

      if (secondary.length > 0) {
        const moreWrap = S.el('div', { class: 'mg-secondary-wrap' });
        if (primary) {
          moreWrap.appendChild(S.el('div', { class: 'mg-secondary-label', text: 'Auch möglich:' }));
        }
        const pills = S.el('div', { class: 'mg-secondary-pills' });
        const visible = secondary.slice(0, PILLS_VISIBLE);
        const hidden = secondary.slice(PILLS_VISIBLE);
        visible.forEach((s) => pills.appendChild(buildSecondaryPill(s, opts)));
        if (hidden.length > 0) {
          const expand = S.el('button', {
            class: 'mg-pill mg-pill-more',
            attrs: { type: 'button', 'aria-label': 'Weitere Vorschläge anzeigen' },
            on: {
              click: () => {
                hidden.forEach(s => pills.insertBefore(buildSecondaryPill(s, opts), expand));
                expand.remove();
              }
            }
          });
          expand.appendChild(S.el('span', { class: 'mg-pill-text', text: `+ ${hidden.length} weitere` }));
          expand.appendChild(S.el('span', { class: 'mg-pill-arrow', attrs: { 'aria-hidden': 'true' }, text: '▾' }));
          pills.appendChild(expand);
        }
        moreWrap.appendChild(pills);
        sugWrap.appendChild(moreWrap);
      }

      card.appendChild(sugWrap);
    }

    return card;
  }

  // ────────────────────────────────────────────────
  // File Chip
  // ────────────────────────────────────────────────
  function buildFileChip(f, typeKey, opts) {
    const chip = S.el('div', { class: 'mg-file', attrs: { 'data-file-id': String(f.id) } });

    // Thumb
    const thumb = S.el('div', { class: 'mg-file-thumb' });
    if (typeKey === 'image' || typeKey === 'heic') {
      M.getFile(f.id).then((rec) => {
        if (rec && rec.blob && rec.blob.type && rec.blob.type.startsWith('image/') && rec.blob.type !== 'image/heic' && rec.blob.type !== 'image/heif') {
          const url = URL.createObjectURL(rec.blob);
          const img = S.el('img', { attrs: { src: url, alt: '', loading: 'lazy' } });
          img.addEventListener('load', () => setTimeout(() => URL.revokeObjectURL(url), 60000));
          while (thumb.firstChild) thumb.removeChild(thumb.firstChild);
          thumb.appendChild(img);
        }
      }).catch(() => {});
    }
    thumb.appendChild(S.parseSVG(KIND_THUMB_ICONS[typeKey] || KIND_THUMB_ICONS.other));
    chip.appendChild(thumb);

    // Info
    const info = S.el('div', { class: 'mg-file-info' });
    info.appendChild(S.el('div', { class: 'mg-file-name', text: f.name, title: f.name }));
    info.appendChild(S.el('div', { class: 'mg-file-meta', text: M.formatBytes(f.size) }));
    chip.appendChild(info);

    // Remove
    const remove = S.el('button', {
      class: 'mg-file-remove',
      attrs: { type: 'button', 'aria-label': `${f.name} aus Mappe entfernen`, title: 'Aus Mappe entfernen' },
      on: {
        click: async (e) => {
          e.stopPropagation();
          if (opts.onFileRemove) {
            try { await opts.onFileRemove(f.id); } catch (err) { console.warn(err); }
          } else {
            await M.deleteFile(f.id);
          }
        }
      }
    });
    remove.appendChild(S.parseSVG(ICON_X));
    chip.appendChild(remove);

    return chip;
  }

  // ────────────────────────────────────────────────
  // Primary CTA — Hero-Suggestion (inverted card mit Custom-Tool-SVG)
  // ────────────────────────────────────────────────
  function buildPrimaryCTA(s, opts) {
    const btn = S.el('button', {
      class: 'mg-primary',
      attrs: { type: 'button', 'data-tool': s.tool },
      on: { click: () => fireSuggestion(s, opts) }
    });

    // Custom-Tool-SVG statt Sparkle/Emoji
    const ico = S.el('span', { class: 'mg-primary-icon', attrs: { 'aria-hidden': 'true' } });
    const toolSvg = TOOL_ICON_SVG[s.tool];
    if (toolSvg) {
      ico.appendChild(S.parseSVG(toolSvg));
    }
    btn.appendChild(ico);

    // Text
    const textWrap = S.el('span', { class: 'mg-primary-text' });
    textWrap.appendChild(S.el('span', { class: 'mg-primary-eyebrow', text: 'Empfohlen · 1 Klick' }));
    textWrap.appendChild(S.el('span', { class: 'mg-primary-headline', text: s.text }));
    textWrap.appendChild(S.el('span', { class: 'mg-primary-tool', text: Sug.prettyToolName(s.tool) }));
    btn.appendChild(textWrap);

    // Arrow
    const arrow = S.el('span', { class: 'mg-primary-arrow', attrs: { 'aria-hidden': 'true' } });
    arrow.appendChild(S.parseSVG(ICON_ARROW));
    btn.appendChild(arrow);

    return btn;
  }

  // ────────────────────────────────────────────────
  // Secondary Card — als sub-card mit kleinem Custom-Tool-SVG
  // (vorher: Pills mit Emoji — jetzt: refined cards mit SVG)
  // ────────────────────────────────────────────────
  function buildSecondaryPill(s, opts) {
    const pill = S.el('button', {
      class: 'mg-pill',
      attrs: { type: 'button', 'data-tool': s.tool, title: s.text },
      on: { click: () => fireSuggestion(s, opts) }
    });
    const ico = S.el('span', { class: 'mg-pill-icon', attrs: { 'aria-hidden': 'true' } });
    const toolSvg = TOOL_ICON_SVG[s.tool];
    if (toolSvg) {
      ico.appendChild(S.parseSVG(toolSvg));
    }
    pill.appendChild(ico);
    pill.appendChild(S.el('span', { class: 'mg-pill-text', text: s.text }));
    const arrow = S.el('span', { class: 'mg-pill-arrow', attrs: { 'aria-hidden': 'true' } });
    arrow.appendChild(S.parseSVG(ICON_ARROW));
    pill.appendChild(arrow);
    return pill;
  }

  // ────────────────────────────────────────────────
  // Fire Suggestion → call user handler or default to URL navigation
  // ────────────────────────────────────────────────
  function fireSuggestion(s, opts) {
    if (opts.onSuggestionClick) {
      try { opts.onSuggestionClick(s.tool, s.fileIds, s); }
      catch (e) { console.warn('[mappe-grouped] onSuggestionClick threw:', e); }
      return;
    }
    // Default: navigate to /tool/?from=mappe&ids=…
    const url = new URL('/' + s.tool + '/', window.location.origin);
    url.searchParams.set('from', 'mappe');
    url.searchParams.set('ids', s.fileIds.join(','));
    window.location.href = url.toString();
  }

  global.MappeGrouped = { render };
})(window);
