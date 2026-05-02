/* CLAWBUIS Tools — Smart-Suggest Engine
 *
 * 100% Browser. Reads only first 12 bytes (Magic-Bytes-Detection).
 * NEVER reads file content beyond signature bytes.
 * Open-source — verify yourself: github.com/samirballhausen-ship-it/clawtools
 */

(function (global) {
  'use strict';

  // ────────────────────────────────────────────────
  // Magic-Bytes Detection (first 12 bytes max)
  // ────────────────────────────────────────────────
  async function detectFileType(file) {
    const buf = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buf);
    const ext = (file.name.match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();

    // PDF: %PDF-
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';

    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpeg';

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png';

    // WebP: RIFF....WEBP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';

    // ISO Base Media (MP4/MOV/HEIC) — bytes 4-7 = 'ftyp', bytes 8-11 = brand
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      // HEIC variants
      if (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'msf1' || brand === 'heim' || brand === 'heis') return 'heic';
      // QuickTime
      if (brand === 'qt  ') return 'mov';
      // MP4 variants
      if (brand === 'mp42' || brand === 'mp41' || brand === 'isom' || brand === 'M4V ' || brand === 'M4A ' || brand === 'avc1' || brand === 'dash') return 'mp4';
      // Default: treat as mp4
      return 'mp4';
    }

    // ZIP-based: PK\x03\x04 — could be docx/xlsx/zip
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
      if (ext === 'docx') return 'docx';
      if (ext === 'xlsx') return 'xlsx';
      if (ext === 'pptx') return 'pptx';
      return 'zip';
    }

    // OGG: 4F 67 67 53
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return 'ogg';

    // MP3: ID3 or FF FB
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return 'mp3';
    if (bytes[0] === 0xFF && (bytes[1] === 0xFB || bytes[1] === 0xFA)) return 'mp3';

    // GIF: GIF87a / GIF89a
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';

    // CSV / TXT — extension only (no reliable magic bytes)
    if (ext === 'csv') return 'csv';
    if (ext === 'txt') return 'txt';
    if (ext === 'json') return 'json';
    if (ext === 'md') return 'md';

    return 'unknown';
  }

  function isImage(t) { return ['jpeg', 'png', 'webp', 'heic', 'gif'].includes(t); }
  function isVideo(t) { return ['mp4', 'mov'].includes(t); }
  function isAudio(t) { return ['mp3', 'ogg'].includes(t); }
  function isOffice(t) { return ['docx', 'xlsx', 'pptx'].includes(t); }

  // ────────────────────────────────────────────────
  // Batch analysis
  // ────────────────────────────────────────────────
  async function analyzeBatch(files) {
    const map = {};
    let totalSize = 0;
    for (const f of files) {
      const t = await detectFileType(f);
      if (!map[t]) map[t] = { count: 0, files: [], size: 0 };
      map[t].count++;
      map[t].files.push(f);
      map[t].size += f.size;
      totalSize += f.size;
    }
    return { typeMap: map, totalSize, totalCount: files.length };
  }

  // ────────────────────────────────────────────────
  // Suggestion catalog
  // ────────────────────────────────────────────────
  // Each suggestion: { tag, title, pitch, href, weight }
  function getSuggestions({ typeMap, totalCount }) {
    const suggestions = [];
    const types = Object.keys(typeMap);

    // ── HEIC (highest confidence) ──
    if (typeMap.heic && typeMap.heic.count >= 1) {
      const n = typeMap.heic.count;
      suggestions.push({
        tag: 'TOP-MATCH',
        title: 'HEIC → JPG umwandeln',
        pitch: `${n} HEIC-${n === 1 ? 'Datei' : 'Dateien'} erkannt. iPhone-Bilder in JPG (universal lesbar) konvertieren.`,
        href: `/heic-zu-jpg?from=hub&n=${n}`,
        weight: 100
      });
    }

    // ── PDF logic ──
    if (typeMap.pdf) {
      const n = typeMap.pdf.count;
      const sizeMB = typeMap.pdf.size / (1024 * 1024);

      if (n >= 2) {
        suggestions.push({
          tag: 'HÄUFIG GENUTZT',
          title: 'PDFs zusammenfügen',
          pitch: `${n} PDFs erkannt. In eine einzige Datei mergen, Reihenfolge per Drag.`,
          href: `/pdf-merger?from=hub&n=${n}`,
          weight: 95
        });
      }
      if (n === 1) {
        suggestions.push({
          tag: 'KLASSIKER',
          title: 'PDF in Einzelseiten splitten',
          pitch: `1 PDF erkannt. Jede Seite wird zur eigenen Datei, optional mit Volltext-Excel.`,
          href: `/pdf-splitter?from=hub&n=1`,
          weight: 85
        });
      }
      if (sizeMB > 5) {
        suggestions.push({
          tag: 'GRÖSSE',
          title: 'PDF komprimieren',
          pitch: `${sizeMB.toFixed(1)} MB — für Mail-Versand schrumpfen.`,
          href: `/pdf-compress?from=hub&n=${n}`,
          weight: 70
        });
      }
      suggestions.push({
        tag: 'TEXT-SUCHE',
        title: 'PDF durchsuchbar machen (OCR)',
        pitch: `Scans in suchbaren Text umwandeln. Läuft im Browser.`,
        href: `/pdf-ocr?from=hub&n=${n}`,
        weight: 50
      });
    }

    // ── Images batch ──
    const imageCount = ['jpeg', 'png', 'webp', 'heic', 'gif']
      .reduce((s, t) => s + (typeMap[t] ? typeMap[t].count : 0), 0);
    const imageSize = ['jpeg', 'png', 'webp', 'heic', 'gif']
      .reduce((s, t) => s + (typeMap[t] ? typeMap[t].size : 0), 0);

    if (imageCount >= 5) {
      suggestions.push({
        tag: 'BATCH',
        title: 'Bilder komprimieren',
        pitch: `${imageCount} Bilder erkannt. Alle gleichzeitig kleiner machen für Mail/WhatsApp.`,
        href: `/images-compress?from=hub&n=${imageCount}`,
        weight: 80
      });
      suggestions.push({
        tag: 'ARCHIV',
        title: 'Nach Aufnahmedatum umbenennen',
        pitch: `Aus EXIF-Daten ein sauberes Archiv: 2026-04-15_001.jpg statt IMG_4523.HEIC.`,
        href: `/exif-rename?from=hub&n=${imageCount}`,
        weight: 60
      });
    }

    if (imageCount >= 1) {
      suggestions.push({
        tag: 'DATENSCHUTZ',
        title: 'EXIF-Daten entfernen',
        pitch: `Standort, Kamera-Modell, Datum aus Bildern strippen — vor Web-Upload.`,
        href: `/exif-strip?from=hub&n=${imageCount}`,
        weight: imageCount === 1 ? 65 : 55
      });
    }

    if (imageCount === 1) {
      suggestions.push({
        tag: 'BILD-EDIT',
        title: 'Hintergrund entfernen',
        pitch: `Person/Objekt freistellen — KI-Modell läuft komplett im Browser (WebGPU).`,
        href: `/bg-remove?from=hub&n=1`,
        weight: 75
      });
    }

    if (imageCount >= 3) {
      suggestions.push({
        tag: 'KOMBINIEREN',
        title: 'Bilder zu PDF zusammenfassen',
        pitch: `Scan-Sammlung als ein PDF — A4-tauglich.`,
        href: `/images-to-pdf?from=hub&n=${imageCount}`,
        weight: 50
      });
    }

    // ── Video ──
    if (typeMap.mp4 || typeMap.mov) {
      const n = (typeMap.mp4?.count || 0) + (typeMap.mov?.count || 0);
      const totalMB = ((typeMap.mp4?.size || 0) + (typeMap.mov?.size || 0)) / (1024 * 1024);

      if (totalMB > 50) {
        suggestions.push({
          tag: 'GRÖSSE',
          title: 'Video komprimieren',
          pitch: `${totalMB.toFixed(0)} MB — für Mail/WhatsApp tauglich machen. ffmpeg im Browser.`,
          href: `/video-compress?from=hub&n=${n}`,
          weight: 90
        });
      } else {
        suggestions.push({
          tag: 'VIDEO',
          title: 'Video komprimieren',
          pitch: `Datei-Größe reduzieren ohne erkennbaren Qualitätsverlust.`,
          href: `/video-compress?from=hub&n=${n}`,
          weight: 70
        });
      }

      if (n === 1) {
        suggestions.push({
          tag: 'SOCIAL',
          title: 'Video → GIF',
          pitch: `Kurze Video-Sequenz zu animiertem GIF — perfekt für Social Media.`,
          href: `/video-zu-gif?from=hub&n=1`,
          weight: 65
        });
      }
    }

    // ── Office ──
    if (typeMap.docx) {
      const n = typeMap.docx.count;
      suggestions.push({
        tag: 'KONVERTIEREN',
        title: 'DOCX → PDF',
        pitch: `${n} Word-${n === 1 ? 'Dokument' : 'Dokumente'} ins universal-lesbare PDF konvertieren.`,
        href: `/docx-zu-pdf?from=hub&n=${n}`,
        weight: 85
      });
    }

    if (typeMap.csv) {
      const n = typeMap.csv.count;
      suggestions.push({
        tag: 'DATEN',
        title: 'CSV bearbeiten',
        pitch: `${n} CSV-${n === 1 ? 'Datei' : 'Dateien'} sortieren, filtern, bereinigen — ohne Excel.`,
        href: `/csv-edit?from=hub&n=${n}`,
        weight: 70
      });
    }

    // ── Unknown / fallback ──
    if (suggestions.length === 0) {
      suggestions.push({
        tag: 'INFO',
        title: 'Hmm — kenne ich noch nicht',
        pitch: `Datei-Typ nicht zugeordnet. Schau in die Tool-Liste unten — vielleicht ist was Passendes dabei.`,
        href: '#tools',
        weight: 0
      });
    }

    // Sort by weight desc, take top 4
    suggestions.sort((a, b) => b.weight - a.weight);
    return suggestions.slice(0, 4);
  }

  // ────────────────────────────────────────────────
  // Format detection-summary for UI
  // ────────────────────────────────────────────────
  function formatDetected({ typeMap, totalSize, totalCount }) {
    const parts = [];
    const labels = {
      pdf: 'PDF', heic: 'HEIC', jpeg: 'JPEG', png: 'PNG', webp: 'WebP', gif: 'GIF',
      mp4: 'MP4', mov: 'MOV', mp3: 'MP3', ogg: 'OGG',
      docx: 'Word', xlsx: 'Excel', pptx: 'PowerPoint',
      csv: 'CSV', txt: 'Text', json: 'JSON', md: 'Markdown', zip: 'ZIP',
      unknown: 'Unbekannt'
    };
    Object.entries(typeMap).forEach(([t, info]) => {
      const lbl = labels[t] || t.toUpperCase();
      parts.push(`${info.count}× ${lbl}`);
    });
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    return parts.join(' · ') + ` — gesamt ${sizeMB} MB`;
  }

  // ────────────────────────────────────────────────
  // UI binding
  // ────────────────────────────────────────────────
  function bindSuggestZone(zoneEl, resultsEl) {
    if (!zoneEl || !resultsEl) return;

    let inputEl = zoneEl.querySelector('input[type="file"]');
    if (!inputEl) {
      inputEl = document.createElement('input');
      inputEl.type = 'file';
      inputEl.multiple = true;
      inputEl.className = 'hidden';
      zoneEl.appendChild(inputEl);
    }

    function handleFiles(fileList) {
      const files = Array.from(fileList);
      if (!files.length) return;
      analyzeBatch(files).then(analysis => renderResults(analysis));
    }

    function renderResults(analysis) {
      const detected = formatDetected(analysis);
      const suggs = getSuggestions(analysis);
      while (resultsEl.firstChild) resultsEl.removeChild(resultsEl.firstChild);

      const detectedEl = Shell.el('div', { class: 'suggest-detected' });
      detectedEl.appendChild(document.createTextNode('Erkannt: '));
      detectedEl.appendChild(Shell.el('strong', { text: detected }));
      detectedEl.appendChild(document.createTextNode(' · 100 % im Browser, kein Upload.'));
      resultsEl.appendChild(detectedEl);

      const cards = Shell.el('div', { class: 'suggest-cards' });
      suggs.forEach(s => {
        const card = Shell.el('a', {
          class: 'suggest-card', attrs: { href: s.href }
        });
        card.appendChild(Shell.el('div', { class: 'suggest-card-tag', text: s.tag }));
        card.appendChild(Shell.el('h3', { text: s.title }));
        card.appendChild(Shell.el('p', { text: s.pitch }));
        cards.appendChild(card);
      });
      resultsEl.appendChild(cards);
      resultsEl.classList.add('active');
    }

    // Click → file picker
    zoneEl.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;       // privacy-link click
      inputEl.click();
    });
    inputEl.addEventListener('change', e => {
      if (e.target.files.length) handleFiles(e.target.files);
      e.target.value = '';
    });

    // Drag-drop
    ['dragenter', 'dragover'].forEach(ev =>
      zoneEl.addEventListener(ev, e => {
        e.preventDefault();
        if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
          zoneEl.classList.add('dragover');
        }
      })
    );
    ['dragleave', 'drop'].forEach(ev =>
      zoneEl.addEventListener(ev, e => {
        e.preventDefault();
        zoneEl.classList.remove('dragover');
      })
    );
    zoneEl.addEventListener('drop', e => {
      e.preventDefault();
      zoneEl.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }

  // ────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────
  global.Suggest = {
    detectFileType,
    analyzeBatch,
    getSuggestions,
    formatDetected,
    bindSuggestZone
  };
})(window);
