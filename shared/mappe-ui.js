/* CLAWBUIS Tools — Datei-Mappe UI Komponenten
 *
 * Nutzt window.Mappe (Storage-Layer) + window.Shell (DOM-Helpers).
 * Komponenten:
 *   Mappe.UI.injectHeaderIcon(rightCluster) → Icon im Header mit Live-Counter
 *   Mappe.UI.openModal({ filterTypes, onSelect }) → Modal (Browse oder Picker)
 *   Mappe.UI.injectDropzoneAlternative(dropzoneEl, opts) → „Aus Mappe wählen"-Block
 *
 * SAFETY: keine innerHTML, alle SVGs hardcoded, alle DOM-Operationen via Shell.el.
 */
(function (global) {
  'use strict';

  const M = global.Mappe;
  const S = global.Shell;
  if (!M || !S) {
    console.warn('[mappe-ui] Mappe oder Shell nicht geladen — UI inaktiv');
    return;
  }

  // ────────────────────────────────────────────────
  // Hardcoded SVG Icons
  // ────────────────────────────────────────────────
  const ICON_FOLDER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
  </svg>`;

  const ICON_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;

  const ICON_DOWNLOAD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`;

  const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>`;

  const KIND_ICONS = {
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
    audio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>`,
    sheet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
  };

  // ────────────────────────────────────────────────
  // Header-Icon
  // ────────────────────────────────────────────────
  function injectHeaderIcon(rightCluster) {
    if (!rightCluster) {
      const header = document.querySelector('.app-header .header-right');
      if (!header) return null;
      rightCluster = header;
    }
    if (rightCluster.querySelector('.mappe-trigger')) return rightCluster.querySelector('.mappe-trigger');

    const btn = S.el('button', {
      class: 'mappe-trigger',
      attrs: { type: 'button', title: 'Datei-Mappe öffnen', 'aria-label': 'Datei-Mappe öffnen' },
      on: { click: () => openModal({ mode: 'browse' }) }
    });
    const ico = S.el('span', { class: 'mappe-trigger-icon', attrs: { 'aria-hidden': 'true' } });
    ico.appendChild(S.parseSVG(ICON_FOLDER));
    btn.appendChild(ico);

    const badge = S.el('span', {
      class: 'mappe-trigger-badge',
      attrs: { 'aria-hidden': 'true' },
      text: '0'
    });
    btn.appendChild(badge);

    // Insert before the meta cluster (so Icon sits left of „Local · No Upload")
    const meta = rightCluster.querySelector('.header-meta');
    if (meta) rightCluster.insertBefore(btn, meta);
    else rightCluster.insertBefore(btn, rightCluster.firstChild);

    refreshBadge(badge);
    M.onChange(() => refreshBadge(badge));
    return btn;
  }

  async function refreshBadge(badge) {
    try {
      const files = await M.listFiles({});
      const n = files.length;
      badge.textContent = String(n);
      badge.classList.toggle('hidden', n === 0);
    } catch (e) {
      badge.classList.add('hidden');
    }
  }

  // ────────────────────────────────────────────────
  // Modal — Browse or Picker
  // ────────────────────────────────────────────────
  let _activeModal = null;

  function openModal(opts = {}) {
    if (_activeModal) { closeModal(); }
    const mode = opts.onSelect ? 'pick' : 'browse';
    const filterTypes = opts.filterTypes || null;
    const onSelect = opts.onSelect || null;

    const backdrop = S.el('div', {
      class: 'mappe-backdrop',
      on: { click: (e) => { if (e.target === backdrop) closeModal(); } }
    });

    const dialog = S.el('div', {
      class: 'mappe-dialog',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Datei-Mappe' }
    });

    // Header
    const head = S.el('div', { class: 'mappe-dialog-head' });
    const title = S.el('div', { class: 'mappe-dialog-title' });
    title.appendChild(S.el('strong', { text: mode === 'pick' ? 'Datei aus Mappe wählen' : 'Deine Mappe' }));
    const subtitle = S.el('span', { class: 'mappe-dialog-sub', text: '' });
    title.appendChild(subtitle);
    head.appendChild(title);

    const closeBtn = S.el('button', {
      class: 'mappe-dialog-close',
      attrs: { type: 'button', 'aria-label': 'Schließen' },
      on: { click: closeModal }
    });
    closeBtn.appendChild(S.parseSVG(ICON_X));
    head.appendChild(closeBtn);
    dialog.appendChild(head);

    // Quota bar
    const quotaBar = S.el('div', { class: 'mappe-quota' });
    const quotaTrack = S.el('div', { class: 'mappe-quota-track' });
    const quotaFill = S.el('div', { class: 'mappe-quota-fill' });
    quotaTrack.appendChild(quotaFill);
    quotaBar.appendChild(quotaTrack);
    const quotaLabel = S.el('div', { class: 'mappe-quota-label', text: '' });
    quotaBar.appendChild(quotaLabel);
    dialog.appendChild(quotaBar);

    // Filter pills (only for browse — pick mode is pre-filtered by caller)
    let activeFilter = 'all';
    const pills = S.el('div', { class: 'mappe-pills' });
    if (mode === 'browse') {
      const FILTERS = [
        { id: 'all', label: 'Alle', match: null },
        { id: 'pdf', label: 'PDFs', match: ['application/pdf'] },
        { id: 'image', label: 'Bilder', match: ['image/*'] },
        { id: 'video', label: 'Videos', match: ['video/*'] },
        { id: 'sheet', label: 'Tabellen', match: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
        { id: 'doc', label: 'Dokumente', match: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] }
      ];
      FILTERS.forEach((f) => {
        const pill = S.el('button', {
          class: 'mappe-pill' + (f.id === 'all' ? ' active' : ''),
          attrs: { type: 'button', 'data-filter': f.id },
          text: f.label,
          on: {
            click: () => {
              activeFilter = f.id;
              pills.querySelectorAll('.mappe-pill').forEach((p) => p.classList.toggle('active', p.dataset.filter === f.id));
              renderList(f.match);
            }
          }
        });
        pills.appendChild(pill);
      });
      dialog.appendChild(pills);
    }

    // Body — File-List
    const body = S.el('div', { class: 'mappe-dialog-body' });
    const list = S.el('div', { class: 'mappe-file-list' });
    const empty = S.el('div', { class: 'mappe-empty', text: 'Noch keine Dateien — lade was hoch in einem Tool, dann erscheinen sie hier.' });
    body.appendChild(list);
    body.appendChild(empty);
    dialog.appendChild(body);

    // Footer
    const footer = S.el('div', { class: 'mappe-dialog-foot' });
    const clearBtn = S.el('button', {
      class: 'mappe-clear-btn',
      attrs: { type: 'button' },
      text: 'Alles löschen',
      on: { click: handleClearAll }
    });
    footer.appendChild(clearBtn);
    const fileCountLabel = S.el('div', { class: 'mappe-file-count', text: '' });
    footer.appendChild(fileCountLabel);
    dialog.appendChild(footer);

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    _activeModal = backdrop;

    // ESC schließt
    function escHandler(e) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', escHandler);
    backdrop._escHandler = escHandler;

    // Subscribe to changes
    const unsubscribe = M.onChange(() => {
      const filter = mode === 'browse'
        ? (filterFromActive(activeFilter))
        : filterTypes;
      renderList(filter);
    });
    backdrop._unsubscribe = unsubscribe;

    // Initial render
    requestAnimationFrame(() => backdrop.classList.add('show'));
    renderList(filterTypes);

    // ────────────────────────────────────────────
    function filterFromActive(id) {
      if (id === 'all') return null;
      if (id === 'pdf') return ['application/pdf'];
      if (id === 'image') return ['image/*'];
      if (id === 'video') return ['video/*'];
      if (id === 'sheet') return ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (id === 'doc') return ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      return null;
    }

    async function renderList(types) {
      const all = await M.listFiles({});
      const filtered = types ? all.filter((f) => M.typeMatches(f.type, types)) : all;

      while (list.firstChild) list.removeChild(list.firstChild);

      if (filtered.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        empty.textContent = all.length === 0
          ? 'Noch keine Dateien — lade was hoch in einem Tool, dann erscheinen sie hier.'
          : 'Keine Dateien dieses Typs in der Mappe.';
      } else {
        list.style.display = '';
        empty.style.display = 'none';
        for (const fileInfo of filtered) {
          list.appendChild(buildFileCard(fileInfo, mode, onSelect));
        }
      }

      fileCountLabel.textContent = `${filtered.length} ${filtered.length === 1 ? 'Datei' : 'Dateien'}${types && all.length > filtered.length ? ` · ${all.length} gesamt` : ''}`;
      clearBtn.disabled = all.length === 0;
      refreshQuota();
    }

    async function refreshQuota() {
      try {
        const q = await M.getQuota();
        const usedMB = q.used / (1024 * 1024);
        const softMB = q.softLimit / (1024 * 1024);
        const pct = Math.min(100, Math.round((q.used / q.softLimit) * 100));
        quotaFill.style.width = pct + '%';
        quotaFill.classList.toggle('warn', pct >= 80);
        const sub = q.fileCount === 1 ? '1 Datei' : `${q.fileCount} Dateien`;
        subtitle.textContent = `· ${sub}`;
        quotaLabel.textContent = `${M.formatBytes(q.used)} von ${softMB.toFixed(0)} MB`;
      } catch (e) { /* quota optional */ }
    }

    async function handleClearAll() {
      const all = await M.listFiles({});
      if (all.length === 0) return;
      const ok = confirm(`Alle ${all.length} Dateien aus der Mappe löschen?\n\nDie Originale auf deinem Gerät bleiben unberührt — gelöscht wird nur die Browser-Mappe.`);
      if (!ok) return;
      await M.clearAll();
      S.Toast.show('Mappe geleert');
    }

    function closeModal() {
      if (!_activeModal) return;
      const m = _activeModal;
      _activeModal = null;
      if (m._escHandler) document.removeEventListener('keydown', m._escHandler);
      if (m._unsubscribe) m._unsubscribe();
      m.classList.remove('show');
      setTimeout(() => m.remove(), 220);
    }
  }

  function closeModal() {
    if (!_activeModal) return;
    const m = _activeModal;
    _activeModal = null;
    if (m._escHandler) document.removeEventListener('keydown', m._escHandler);
    if (m._unsubscribe) m._unsubscribe();
    m.classList.remove('show');
    setTimeout(() => m.remove(), 220);
  }

  // ────────────────────────────────────────────────
  // File-Card (Liste-Item)
  // ────────────────────────────────────────────────
  function buildFileCard(info, mode, onSelect) {
    const card = S.el('div', { class: 'mappe-file-card', attrs: { 'data-file-id': String(info.id) } });

    // Thumb (image preview if image, otherwise kind-icon)
    const thumb = S.el('div', { class: 'mappe-thumb mappe-thumb-' + M.getKindIcon(info.type, info.name) });
    const kind = M.getKindIcon(info.type, info.name);
    if (kind === 'image') {
      // Async image preview
      M.getFile(info.id).then((rec) => {
        if (rec && rec.blob) {
          const url = URL.createObjectURL(rec.blob);
          const img = S.el('img', { attrs: { src: url, alt: '', loading: 'lazy' } });
          img.addEventListener('load', () => setTimeout(() => URL.revokeObjectURL(url), 60000));
          while (thumb.firstChild) thumb.removeChild(thumb.firstChild);
          thumb.appendChild(img);
        }
      }).catch(() => {});
      thumb.appendChild(S.parseSVG(KIND_ICONS.image));
    } else {
      thumb.appendChild(S.parseSVG(KIND_ICONS[kind] || KIND_ICONS.file));
    }
    card.appendChild(thumb);

    // Info
    const infoBox = S.el('div', { class: 'mappe-info' });
    infoBox.appendChild(S.el('div', { class: 'mappe-name', text: info.name, title: info.name }));
    const meta = S.el('div', { class: 'mappe-meta' });
    meta.appendChild(document.createTextNode(M.formatBytes(info.size)));
    meta.appendChild(document.createTextNode(' · '));
    meta.appendChild(document.createTextNode(M.formatRelativeTime(info.addedAt)));
    if (info.sourceTool && info.sourceTool !== 'unknown') {
      meta.appendChild(document.createTextNode(' · aus ' + prettyToolName(info.sourceTool)));
    }
    infoBox.appendChild(meta);
    card.appendChild(infoBox);

    // Actions
    const actions = S.el('div', { class: 'mappe-actions' });

    if (mode === 'pick') {
      const pickBtn = S.el('button', {
        class: 'mappe-btn mappe-btn-primary',
        attrs: { type: 'button' },
        text: 'Wählen',
        on: {
          click: async () => {
            try {
              const rec = await M.getFile(info.id);
              if (!rec || !rec.blob) {
                S.Toast.show('Datei nicht mehr verfügbar', true);
                return;
              }
              // Konvertiere blob → File-like object mit name/type
              const fileLike = new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.addedAt });
              onSelect(fileLike, rec);
              closeModal();
            } catch (e) {
              console.error(e);
              S.Toast.show('Fehler beim Laden: ' + (e.message || 'unbekannt'), true);
            }
          }
        }
      });
      actions.appendChild(pickBtn);
    } else {
      // Browse mode — show download + delete
      const dl = S.el('button', {
        class: 'mappe-btn mappe-btn-icon',
        attrs: { type: 'button', title: 'Herunterladen', 'aria-label': 'Datei herunterladen' },
        on: { click: () => downloadFile(info) }
      });
      dl.appendChild(S.parseSVG(ICON_DOWNLOAD));
      actions.appendChild(dl);
    }

    const del = S.el('button', {
      class: 'mappe-btn mappe-btn-icon mappe-btn-danger',
      attrs: { type: 'button', title: 'Aus Mappe entfernen', 'aria-label': 'Aus Mappe entfernen' },
      on: { click: async () => {
        await M.deleteFile(info.id);
        S.Toast.show('Aus Mappe entfernt');
      }}
    });
    del.appendChild(S.parseSVG(ICON_TRASH));
    actions.appendChild(del);

    card.appendChild(actions);
    return card;
  }

  async function downloadFile(info) {
    try {
      const rec = await M.getFile(info.id);
      if (!rec || !rec.blob) {
        S.Toast.show('Datei nicht mehr verfügbar', true);
        return;
      }
      const url = URL.createObjectURL(rec.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = rec.name || 'datei';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      S.Toast.show('Download fehlgeschlagen: ' + (e.message || ''), true);
    }
  }

  function prettyToolName(slug) {
    const map = {
      'pdf-merger': 'PDF-Merger',
      'pdf-splitter': 'PDF-Splitter',
      'pdf-redact': 'PDF-Schwärzen',
      'pdf-to-word': 'PDF→Word',
      'pdf-compress': 'PDF-Komprimierer',
      'pdf-watermark': 'PDF-Wasserzeichen',
      'pdf-sign': 'PDF-Signieren',
      'pdf-ocr': 'PDF-OCR',
      'images-compress': 'Bilder-Komprimieren',
      'images-to-pdf': 'Bilder→PDF',
      'heic-zu-jpg': 'iPhone-Foto-Konverter',
      'exif-strip': 'Foto-Daten-Entfernen',
      'exif-rename': 'Foto-Umbenennen',
      'docx-zu-pdf': 'Word→PDF',
      'video-compress': 'Video-Komprimierer',
      'video-zu-gif': 'Video→GIF',
      'bg-remove': 'Hintergrund-Entfernen',
      'csv-edit': 'Tabellen-Editor',
      'hub': 'Hub',
      'hub-suggest': 'Hub-Vorschlag'
    };
    return map[slug] || slug;
  }

  // ────────────────────────────────────────────────
  // Dropzone-Alternative — „Aus Mappe wählen" Button
  // ────────────────────────────────────────────────
  function injectDropzoneAlternative(dropzoneEl, opts) {
    if (!dropzoneEl) return null;
    if (dropzoneEl.querySelector('.dropzone-alt')) return dropzoneEl.querySelector('.dropzone-alt');

    const types = opts.accept || null;
    const onPick = opts.onPick;
    if (typeof onPick !== 'function') {
      console.warn('[mappe-ui] injectDropzoneAlternative: onPick required');
      return null;
    }

    const alt = S.el('div', { class: 'dropzone-alt' });
    const sep = S.el('span', { class: 'dropzone-alt-sep', text: 'oder' });
    alt.appendChild(sep);

    const btn = S.el('button', {
      class: 'btn btn-secondary btn-sm dropzone-alt-btn',
      attrs: { type: 'button' },
      on: {
        click: (e) => {
          e.stopPropagation();
          openModal({
            filterTypes: types,
            onSelect: async (file) => {
              try {
                await onPick(file);
              } catch (err) {
                console.error('[dropzone-alt] onPick error:', err);
                S.Toast.show('Konnte Datei nicht laden: ' + (err.message || 'unbekannt'), true);
              }
            }
          });
        }
      }
    });
    btn.appendChild(S.parseSVG(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>`));
    btn.appendChild(document.createTextNode('Aus Mappe wählen'));
    alt.appendChild(btn);

    const hint = S.el('span', { class: 'dropzone-alt-hint', text: '' });
    alt.appendChild(hint);

    dropzoneEl.appendChild(alt);

    // Update hint based on file count
    async function refreshHint() {
      try {
        const all = await M.listFiles({ types });
        if (all.length === 0) {
          alt.classList.add('hidden');
        } else {
          alt.classList.remove('hidden');
          hint.textContent = `(${all.length} verfügbar)`;
        }
      } catch (e) {
        alt.classList.add('hidden');
      }
    }
    refreshHint();
    M.onChange(refreshHint);
    return alt;
  }

  // ────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────
  M.UI = {
    injectHeaderIcon,
    openModal,
    closeModal,
    injectDropzoneAlternative,
    prettyToolName
  };
})(window);
