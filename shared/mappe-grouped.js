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
  // Hardcoded SVG Icons
  // ────────────────────────────────────────────────
  const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const ICON_SPARKLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>';

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

    // ─── Header ───
    const head = S.el('div', { class: 'mg-group-head' });
    const emoji = S.el('span', { class: 'mg-group-emoji', text: meta.emoji, attrs: { 'aria-hidden': 'true' } });
    const titleWrap = S.el('div', { class: 'mg-group-title-wrap' });
    const title = S.el('h3', { class: 'mg-group-title', text: meta.label });
    const countLabel = files.length === 1 ? `1 ${meta.singular}` : `${files.length} ${meta.plural}`;
    const sub = S.el('span', { class: 'mg-group-count', text: countLabel });
    titleWrap.appendChild(title);
    titleWrap.appendChild(sub);
    head.appendChild(emoji);
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
  // Primary CTA — Hero-Suggestion
  // ────────────────────────────────────────────────
  function buildPrimaryCTA(s, opts) {
    const btn = S.el('button', {
      class: 'mg-primary',
      attrs: { type: 'button', 'data-tool': s.tool },
      on: { click: () => fireSuggestion(s, opts) }
    });

    // Sparkle marker
    const sparkle = S.el('span', { class: 'mg-primary-sparkle', attrs: { 'aria-hidden': 'true' } });
    sparkle.appendChild(S.parseSVG(ICON_SPARKLE));
    btn.appendChild(sparkle);

    // Text
    const textWrap = S.el('span', { class: 'mg-primary-text' });
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
  // Secondary Pill
  // ────────────────────────────────────────────────
  function buildSecondaryPill(s, opts) {
    const pill = S.el('button', {
      class: 'mg-pill',
      attrs: { type: 'button', 'data-tool': s.tool, title: s.text },
      on: { click: () => fireSuggestion(s, opts) }
    });
    if (s.emoji) {
      pill.appendChild(S.el('span', { class: 'mg-pill-emoji', text: s.emoji, attrs: { 'aria-hidden': 'true' } }));
    }
    pill.appendChild(S.el('span', { class: 'mg-pill-text', text: s.text }));
    pill.appendChild(S.el('span', { class: 'mg-pill-arrow', attrs: { 'aria-hidden': 'true' }, text: '→' }));
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
