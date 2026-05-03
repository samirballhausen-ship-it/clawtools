/* CLAWBUIS Tools Platform — Shared Shell JS
 * Header/Footer/Privacy/Cosmos auto-inject · Toast · Tour-Engine
 *
 * SAFETY: Uses DOMParser for SVG injection (no innerHTML with user data).
 * All injected markup is hardcoded constants in this file — verifiable on GitHub.
 *
 * Convention: every page calls Shell.init({ tag, tour, privacy, toolName })
 * after DOMContentLoaded.
 */

(function (global) {
  'use strict';

  // ────────────────────────────────────────────────
  // Brand Logo SVG (5 Claw Marks + Core)
  // Hardcoded constants — never user-derived.
  // ────────────────────────────────────────────────
  const BRAND_LOGO_SVG = `<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="none" stroke="#0a0a0a" stroke-linecap="round">
      <path d="M 20 52 C 16 44, 9 34, 7 24 C 5 16, 7 10, 11 10" stroke-width="2.2"/>
      <path d="M 23 46 C 21 36, 18 22, 19 12 C 20 6, 22 2, 25 4" stroke-width="2.4"/>
      <path d="M 30 44 C 29 32, 30 18, 32 6 C 33 1, 35 0, 36 3" stroke-width="2.6"/>
      <path d="M 38 46 C 40 36, 43 22, 44 12 C 45 6, 43 2, 40 4" stroke-width="2.4"/>
      <path d="M 44 52 C 48 44, 55 34, 57 24 C 59 16, 57 12, 53 12" stroke-width="2"/>
    </g>
    <path d="M 18 54 C 20 60, 26 64, 32 64 C 38 64, 44 60, 46 54"
          fill="none" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
    <circle cx="32" cy="50" r="2.4" fill="#15803d"/>
  </svg>`;

  const BRAND_LOGO_LIGHT = `<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="none" stroke="rgba(255,255,255,0.95)" stroke-linecap="round">
      <path d="M 20 52 C 16 44, 9 34, 7 24 C 5 16, 7 10, 11 10" stroke-width="2.2"/>
      <path d="M 23 46 C 21 36, 18 22, 19 12 C 20 6, 22 2, 25 4" stroke-width="2.4"/>
      <path d="M 30 44 C 29 32, 30 18, 32 6 C 33 1, 35 0, 36 3" stroke-width="2.6"/>
      <path d="M 38 46 C 40 36, 43 22, 44 12 C 45 6, 43 2, 40 4" stroke-width="2.4"/>
      <path d="M 44 52 C 48 44, 55 34, 57 24 C 59 16, 57 12, 53 12" stroke-width="2"/>
    </g>
    <path d="M 18 54 C 20 60, 26 64, 32 64 C 38 64, 44 60, 46 54"
          fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="32" cy="50" r="2.4" fill="#2dd4bf" opacity="0.95"/>
  </svg>`;

  const PRIVACY_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>`;

  const COSMOS_SVG_FRAME = `<svg viewBox="0 0 1200 64" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg>`;

  const INSTA_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>`;

  // ────────────────────────────────────────────────
  // SVG Parser — DOMParser-based, XSS-safe
  // ────────────────────────────────────────────────
  function parseSVG(svgString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const err = doc.querySelector('parsererror');
    if (err) {
      console.error('SVG parse error:', err.textContent);
      return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    }
    return doc.documentElement;
  }

  // ────────────────────────────────────────────────
  // DOM helpers (no innerHTML, ever)
  // ────────────────────────────────────────────────
  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.class) node.className = opts.class;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.title != null) node.title = opts.title;
    if (opts.attrs) {
      for (const [k, v] of Object.entries(opts.attrs)) {
        if (v == null) continue;
        node.setAttribute(k, v);
      }
    }
    if (opts.style) {
      for (const [k, v] of Object.entries(opts.style)) node.style.setProperty(k, v);
    }
    if (opts.on) {
      for (const [k, v] of Object.entries(opts.on)) node.addEventListener(k, v);
    }
    children.forEach(c => c && node.appendChild(c));
    return node;
  }

  // ────────────────────────────────────────────────
  // Toast
  // ────────────────────────────────────────────────
  let toastEl = null;
  let toastTimer = null;
  function ensureToast() {
    if (!toastEl) {
      toastEl = el('div', { class: 'toast', attrs: { role: 'status', 'aria-live': 'polite' } });
      document.body.appendChild(toastEl);
    }
    return toastEl;
  }
  const Toast = {
    show(msg, isError = false) {
      const t = ensureToast();
      t.textContent = msg;
      t.classList.toggle('error', isError);
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
    }
  };

  // ────────────────────────────────────────────────
  // Header
  // ────────────────────────────────────────────────
  function injectHeader({ tag, tour } = {}) {
    if (document.querySelector('.app-header')) return;

    const inner = el('div', { class: 'app-header-inner' });

    // Brand
    const brand = el('a', {
      class: 'brand', attrs: { href: '/', 'aria-label': 'CLAWBUIS Tools — zur Übersicht' }
    });
    const logo = el('span', { class: 'brand-logo' });
    logo.appendChild(parseSVG(BRAND_LOGO_SVG));
    const text = el('div', { class: 'brand-text' });
    text.appendChild(el('span', { class: 'brand-name', text: 'CLAWBUIS' }));
    if (tag) text.appendChild(el('span', { class: 'brand-tag', text: tag }));
    brand.appendChild(logo);
    brand.appendChild(text);
    inner.appendChild(brand);

    // Right cluster
    const right = el('div', { class: 'header-right' });
    if (tour) {
      const tourBtn = el('button', {
        class: 'tour-trigger',
        attrs: { type: 'button', title: 'Anleitung anzeigen', 'aria-label': 'Tour starten' },
        text: '?',
        on: { click: () => Tour.start(global.__tutorial || []) }
      });
      right.appendChild(tourBtn);
    }
    const meta = el('div', { class: 'header-meta' });
    meta.appendChild(el('span', { class: 'dot' }));
    meta.appendChild(el('span', { class: 'header-meta-label', text: 'Local · No Upload' }));
    right.appendChild(meta);
    inner.appendChild(right);

    const header = el('header', { class: 'app-header' }, [inner]);
    document.body.insertBefore(header, document.body.firstChild);
  }

  // ────────────────────────────────────────────────
  // Privacy Banner
  // ────────────────────────────────────────────────
  function injectPrivacy() {
    const main = document.querySelector('.app-main');
    if (!main) return;
    if (main.querySelector('.privacy')) return;

    const details = el('details', { class: 'privacy', attrs: { 'aria-labelledby': 'privacyTitle' } });
    const summary = el('summary', { class: 'privacy-summary' });
    const iconWrap = el('span', { class: 'privacy-icon', attrs: { 'aria-hidden': 'true' } });
    iconWrap.appendChild(parseSVG(PRIVACY_ICON_SVG));
    summary.appendChild(iconWrap);
    const summaryText = el('span', { class: 'privacy-summary-text' });
    summaryText.appendChild(el('strong', { attrs: { id: 'privacyTitle' }, text: 'Datenschutz' }));
    summaryText.appendChild(document.createTextNode(' · '));
    summaryText.appendChild(el('span', { text: '100 % lokal · keine Uploads · DSGVO' }));
    summary.appendChild(summaryText);
    summary.appendChild(el('span', { class: 'privacy-chevron', attrs: { 'aria-hidden': 'true' }, text: '▾' }));
    details.appendChild(summary);

    const body = el('div', { class: 'privacy-body' });
    const p = el('p');
    p.appendChild(document.createTextNode('Dieses Werkzeug verarbeitet deine Dateien '));
    p.appendChild(el('strong', { text: 'ausschließlich lokal in deinem Browser' }));
    p.appendChild(document.createTextNode('. Sie werden zu keinem Zeitpunkt an einen Server übertragen — auch nicht an die Hosting-Plattform dieser Seite. Geeignet für vertrauliche Dokumente (Verträge, Mandantenakten, Personaldaten, Rechnungen).'));
    body.appendChild(p);

    const ul = el('ul');
    ['Keine Datei-Uploads. Verarbeitung 100 % im Browser-Speicher (RAM).',
     'Keine Cookies, kein Tracking, keine Analytics.',
     'Keine Server-Logs zu Datei-Inhalten — die Seite ist statisches HTML.',
     'Externe Bibliotheken werden über öffentliche CDNs (jsdelivr, cdnjs) geladen — diese sehen nur die Anfrage nach den JS-Dateien selbst, niemals deine Daten.',
     'Mit Schließen des Tabs werden alle geladenen Dateien aus dem Speicher entfernt.',
     'Deine Mappe (IndexedDB im Browser) bleibt zwischen Tabs und Sitzungen erhalten — nur du löschst sie. Tool-Verarbeitung, Reload und Tab-Wechsel berühren sie nicht. Komplett-Reset jederzeit über das Mappe-Symbol oben rechts → „Alles löschen" oder direkt im Hub-Library-Bereich.'
    ].forEach(t => ul.appendChild(el('li', { text: t })));
    body.appendChild(ul);

    details.appendChild(body);
    main.appendChild(details);
  }

  // ────────────────────────────────────────────────
  // Cosmos Strip + Footer
  // ────────────────────────────────────────────────
  function injectFooter(toolName) {
    if (document.querySelector('.app-footer')) return;

    // Cosmos band — div container with stars + branded center
    const cosmos = el('div', {
      class: 'cosmos',
      attrs: { 'aria-label': 'CLAWBUIS Brand-Strip' }
    });
    const cosmosSvg = parseSVG(COSMOS_SVG_FRAME);
    cosmosSvg.classList.add('cosmos-svg');
    cosmos.appendChild(cosmosSvg);

    // Center content: brand link + instagram link
    const cosmosCenter = el('div', { class: 'cosmos-center' });

    const brandLink = el('a', {
      class: 'cosmos-brand',
      attrs: {
        href: 'https://clawbuis.com',
        target: '_blank', rel: 'noopener noreferrer',
        'aria-label': 'CLAWBUIS Hauptseite'
      }
    });
    const brandLogo = el('span', { class: 'cosmos-logo' });
    brandLogo.appendChild(parseSVG(BRAND_LOGO_LIGHT));
    brandLink.appendChild(brandLogo);
    brandLink.appendChild(el('span', { class: 'cosmos-name', text: 'CLAWBUIS' }));
    cosmosCenter.appendChild(brandLink);

    const instaLink = el('a', {
      class: 'cosmos-insta',
      attrs: {
        href: 'https://instagram.com/clawbuis',
        target: '_blank', rel: 'noopener noreferrer',
        'aria-label': 'CLAWBUIS auf Instagram'
      }
    });
    instaLink.appendChild(parseSVG(INSTA_ICON_SVG));
    cosmosCenter.appendChild(instaLink);

    cosmos.appendChild(cosmosCenter);
    document.body.appendChild(cosmos);

    buildCosmos(cosmosSvg);

    // Footer
    const inner = el('div', { class: 'app-footer-inner' });
    const left = el('div');
    left.appendChild(document.createTextNode('CLAWBUIS · '));
    left.appendChild(el('strong', { text: toolName || 'Tools' }));
    inner.appendChild(left);

    const nav = el('nav', { class: 'app-footer-nav' });
    [['Impressum', '/impressum'],
     ['Datenschutz', '/datenschutz'],
     ['AGB', '/agb']
    ].forEach(([txt, href]) => {
      const a = el('a', {
        text: txt,
        attrs: { href }
      });
      nav.appendChild(a);
    });
    inner.appendChild(nav);

    // Source-Hinweis: subtle, devs-only — Code öffentlich auf GitHub.
    // Custom-SVG (kein GitHub-Trademark): drei verbundene Knoten = Repository-Mark.
    const sourceWrap = el('div', { class: 'app-footer-source', attrs: { 'aria-label': 'Quellcode dieser Seite' } });
    const sourceMark = parseSVG(`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="4" cy="4" r="1.5"/>
      <circle cx="4" cy="12" r="1.5"/>
      <circle cx="12" cy="8" r="1.5"/>
      <path d="M4 5.5v5"/>
      <path d="M5.5 4h3a3 3 0 0 1 3 3v.5"/>
      <path d="M5.5 12h3a3 3 0 0 0 3-3v-.5"/>
    </svg>`);
    sourceMark.classList.add('app-footer-source-mark');
    sourceWrap.appendChild(sourceMark);
    sourceWrap.appendChild(document.createTextNode('Code öffentlich · '));
    const sourceLink = el('a', {
      text: 'samirballhausen-ship-it/clawtools',
      attrs: { href: 'https://github.com/samirballhausen-ship-it/clawtools', target: '_blank', rel: 'noopener noreferrer' }
    });
    sourceWrap.appendChild(sourceLink);
    inner.appendChild(sourceWrap);

    const footer = el('footer', { class: 'app-footer' }, [inner]);
    document.body.appendChild(footer);
  }

  function buildCosmos(svgEl) {
    if (!svgEl) return;
    const NS = 'http://www.w3.org/2000/svg';

    const neb1 = document.createElementNS(NS, 'ellipse');
    Object.entries({ cx: 210, cy: 32, rx: 180, ry: 38, fill: '#2dd4bf', opacity: 0.06 })
      .forEach(([k, v]) => neb1.setAttribute(k, v));
    neb1.setAttribute('filter', 'blur(20px)');
    svgEl.appendChild(neb1);

    const neb2 = document.createElementNS(NS, 'ellipse');
    Object.entries({ cx: 950, cy: 34, rx: 210, ry: 36, fill: '#c29b62', opacity: 0.07 })
      .forEach(([k, v]) => neb2.setAttribute(k, v));
    neb2.setAttribute('filter', 'blur(24px)');
    svgEl.appendChild(neb2);

    const STARS = 70;
    let placed = 0, attempts = 0;
    while (placed < STARS && attempts < 400) {
      attempts++;
      const x = Math.random() * 1200;
      const y = Math.random() * 64;
      if (Math.abs(x - 600) < 80 && Math.abs(y - 32) < 16) continue;
      const r = Math.random() < 0.85 ? 0.5 + Math.random() * 0.7 : 1.2 + Math.random() * 0.8;
      const o = 0.35 + Math.random() * 0.55;
      const dur = 2 + Math.random() * 4;
      const delay = Math.random() * 4;
      const star = document.createElementNS(NS, 'circle');
      star.setAttribute('class', 'star');
      star.setAttribute('cx', x.toFixed(1));
      star.setAttribute('cy', y.toFixed(1));
      star.setAttribute('r', r.toFixed(2));
      star.setAttribute('fill', Math.random() < 0.92 ? '#ffffff' : '#bcd9ff');
      star.style.setProperty('--o', o.toFixed(2));
      star.style.setProperty('--d', dur.toFixed(2) + 's');
      star.style.opacity = o.toFixed(2);
      star.style.animationDelay = (-delay).toFixed(2) + 's';
      svgEl.appendChild(star);
      placed++;
    }
  }

  // ────────────────────────────────────────────────
  // Tour Engine
  // ────────────────────────────────────────────────
  let tourState = { steps: [], idx: 0, backdrop: null, tooltip: null, cutout: null };

  const Tour = {
    start(steps) {
      if (!steps || !steps.length) {
        Toast.show('Für dieses Werkzeug gibt es noch keine Anleitung.');
        return;
      }
      if (tourState.backdrop) Tour._end();
      tourState.steps = steps;
      tourState.idx = 0;
      Tour._buildOverlay();
      Tour._render();
      document.addEventListener('keydown', Tour._handleKey);
      window.addEventListener('resize', Tour._reposition);
    },

    _buildOverlay() {
      const back = el('div', { class: 'tour-backdrop active', on: { click: Tour.skip } });
      const cutout = el('div', { class: 'tour-cutout' });
      const tooltip = el('div', { class: 'tour-tooltip', on: { click: e => e.stopPropagation() } });
      back.appendChild(cutout);
      back.appendChild(tooltip);
      document.body.appendChild(back);
      tourState.backdrop = back;
      tourState.cutout = cutout;
      tourState.tooltip = tooltip;
    },

    _render() {
      const { steps, idx, tooltip, cutout } = tourState;
      const step = steps[idx];
      if (!step) return Tour._end();

      const requestedTarget = step.target ? document.querySelector(step.target) : null;
      const targetIsVisible = (node) => {
        if (!node || typeof node.getBoundingClientRect !== 'function') return false;
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const fallbackSelector = step.fallback || '#dropzone, .dropzone, .hero, .app-main';
      const fallbackTarget = document.querySelector(fallbackSelector) || document.querySelector('.app-main') || document.body;
      const usesFallback = !targetIsVisible(requestedTarget);
      const target = usesFallback ? fallbackTarget : requestedTarget;

      const r = target.getBoundingClientRect();
      const pad = 6;
      cutout.classList.toggle('soft', usesFallback);
      cutout.style.top = (r.top + window.scrollY - pad) + 'px';
      cutout.style.left = (r.left + window.scrollX - pad) + 'px';
      cutout.style.width = (r.width + pad * 2) + 'px';
      cutout.style.height = (r.height + pad * 2) + 'px';

      while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
      const stepLabel = el('div', { class: 'tour-tooltip-step' });
      stepLabel.appendChild(el('strong', { text: String(idx + 1).padStart(2, '0') }));
      stepLabel.appendChild(document.createTextNode(' / ' + String(steps.length).padStart(2, '0')));
      tooltip.appendChild(stepLabel);
      tooltip.appendChild(el('h4', { text: step.title }));
      tooltip.appendChild(el('p', { text: step.text }));

      const actions = el('div', { class: 'tour-tooltip-actions' });
      actions.appendChild(el('button', {
        class: 'tour-btn tour-btn-skip',
        text: idx === 0 ? 'Überspringen' : 'Beenden',
        on: { click: Tour.skip }
      }));
      actions.appendChild(el('button', {
        class: 'tour-btn tour-btn-next',
        text: idx === steps.length - 1 ? 'Fertig' : 'Weiter →',
        on: { click: () => idx === steps.length - 1 ? Tour._end() : Tour.next() }
      }));
      tooltip.appendChild(actions);

      // Bottom-Sheet via CSS — keine inline-Position mehr nötig.
      // Nur scroll zum Target damit Cutout im sichtbaren Bereich liegt.
      // Block: 'center' aber mit reservierter Bottom-Sheet-Höhe (max ~50% screen).
      target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' });
      // Korrektur: beim block:'start' kann Header verdecken — daher kleiner Offset
      setTimeout(() => {
        const r2 = target.getBoundingClientRect();
        const headerH = document.querySelector('.app-header')?.offsetHeight || 64;
        if (r2.top < headerH + 20) {
          window.scrollBy({ top: r2.top - headerH - 24, behavior: 'smooth' });
        }
      }, 50);
    },

    _positionTooltip() { /* noop — Tooltip wird via CSS positioniert (bottom-sheet) */ },

    _reposition() {
      const step = tourState.steps[tourState.idx];
      if (step) Tour._render();
    },

    next() {
      tourState.idx++;
      if (tourState.idx >= tourState.steps.length) return Tour._end();
      Tour._render();
    },

    skip() { Tour._end(); },

    _end() {
      if (tourState.backdrop) tourState.backdrop.remove();
      tourState.backdrop = null;
      tourState.cutout = null;
      tourState.tooltip = null;
      document.removeEventListener('keydown', Tour._handleKey);
      window.removeEventListener('resize', Tour._reposition);
    },

    _handleKey(e) {
      if (e.key === 'Escape') Tour.skip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') Tour.next();
      if (e.key === 'ArrowLeft') {
        if (tourState.idx > 0) { tourState.idx--; Tour._render(); }
      }
    },

    maybeShowWelcome() {
      if (!global.__tutorial || !global.__tutorial.length) return;
      try {
        if (localStorage.getItem('clawtour_dismissed') === '1') return;
      } catch (e) { return; }

      const card = el('div', { class: 'tour-welcome' });
      card.appendChild(el('h4', { text: 'Erstes Mal hier?' }));
      card.appendChild(el('p', { text: 'Soll ich dir kurz zeigen, wie das Werkzeug funktioniert? (~30 Sekunden)' }));
      const actions = el('div', { class: 'tour-welcome-actions' });
      actions.appendChild(el('button', {
        class: 'tour-btn tour-btn-skip',
        text: 'Nein, danke',
        on: { click: () => Tour._dismissWelcome(card, true) }
      }));
      actions.appendChild(el('button', {
        class: 'tour-btn tour-btn-next',
        text: 'Ja, zeig mal',
        on: {
          click: () => {
            Tour._dismissWelcome(card, true);
            Tour.start(global.__tutorial || []);
          }
        }
      }));
      card.appendChild(actions);
      document.body.appendChild(card);
      requestAnimationFrame(() => card.classList.add('show'));
      setTimeout(() => Tour._dismissWelcome(card, false), 12000);
    },

    _dismissWelcome(card, persist) {
      card.classList.remove('show');
      setTimeout(() => card.remove(), 400);
      if (persist) {
        try { localStorage.setItem('clawtour_dismissed', '1'); } catch (e) {}
      }
    }
  };

  function checkUrlTour() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === '1' && global.__tutorial) {
      setTimeout(() => Tour.start(global.__tutorial), 600);
    }
  }

  // ────────────────────────────────────────────────
  // Datei-Mappe — Auto-Load & Header-Icon
  // Mappe-Scripts werden dynamisch nachgeladen, damit Tools sie nicht
  // einzeln einbinden müssen. Falls bereits geladen (z.B. test-harness),
  // skippt loadScript via Cache-Check.
  // ────────────────────────────────────────────────
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.dataset.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  async function setupMappeUI() {
    try {
      if (!global.Mappe) await loadScript('/shared/mappe.js');
      if (global.Mappe && !global.Mappe.UI) await loadScript('/shared/mappe-ui.js');
      if (!global.Suggestions) await loadScript('/shared/suggestions.js');
      if (!global.MappeGrouped) await loadScript('/shared/mappe-grouped.js');
      if (global.Mappe && global.Mappe.UI) {
        const rightCluster = document.querySelector('.app-header .header-right');
        if (rightCluster) global.Mappe.UI.injectHeaderIcon(rightCluster);
      }
    } catch (e) {
      console.warn('[shell] Mappe load failed:', e);
    }
  }

  // ────────────────────────────────────────────────
  // Init
  // ────────────────────────────────────────────────
  function init(opts = {}) {
    const cfg = {
      tag: opts.tag || null,
      tour: opts.tour !== false,
      privacy: opts.privacy !== false,
      footer: opts.footer !== false,
      mappe: opts.mappe !== false,
      toolName: opts.toolName || ''
    };
    injectPWAMeta();
    injectHeader({ tag: cfg.tag, tour: cfg.tour });
    if (cfg.privacy) injectPrivacy();
    if (cfg.footer) injectFooter(cfg.toolName);
    if (cfg.tour) {
      const tourRequested = new URLSearchParams(window.location.search).get('tour') === '1';
      checkUrlTour();
      if (!opts.isHub && !tourRequested) {
        setTimeout(() => Tour.maybeShowWelcome(), 1500);
      }
    }
    setupPWA(opts.isHub);
    if (cfg.mappe) setupMappeUI();
    // BUG-RESET-001: Auto-Inject "× verwerfen" sobald editorView visible wird
    setupAutoReset();
  }

  // ────────────────────────────────────────────────
  // PWA — Auto-Inject Manifest + Apple Meta + Service Worker + Install Button
  // ────────────────────────────────────────────────
  function injectPWAMeta() {
    const head = document.head;
    function ensure(tag, attrs) {
      const sel = Object.entries(attrs).map(([k, v]) => `[${k}="${v}"]`).slice(0, 2).join('');
      if (head.querySelector(`${tag}${sel}`)) return;
      const e = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
      head.appendChild(e);
    }
    ensure('link', { rel: 'manifest', href: '/manifest.webmanifest' });
    ensure('meta', { name: 'theme-color', content: '#15803d' });
    ensure('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    ensure('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
    ensure('meta', { name: 'apple-mobile-web-app-title', content: 'Tools' });
    ensure('link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/shared/icons/apple-touch-icon-180.png' });
    ensure('link', { rel: 'apple-touch-icon', sizes: '167x167', href: '/shared/icons/apple-touch-icon-167.png' });
    ensure('link', { rel: 'apple-touch-icon', sizes: '152x152', href: '/shared/icons/apple-touch-icon-152.png' });
  }

  let deferredInstallPrompt = null;
  function setupPWA(isHub) {
    // Register service worker — mit auto-reload bei Update
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
          .then((reg) => {
            // Periodisch nach Updates checken (jede 30 min wenn Tab offen)
            setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
            // Bei explizitem Update: wenn ein neuer SW wartet, sofort aktivieren
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Es gibt eine ältere SW-Version → der neue ist installed und wartet
                  newWorker.postMessage('SKIP_WAITING');
                }
              });
            });
          })
          .catch((e) => console.warn('[sw] register failed', e));

        // Wenn der aktive SW wechselt (durch SKIP_WAITING) → Page einmal neuladen
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });

        // Listen auf Update-Notification
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SW_UPDATED') {
            console.log('[sw] updated to', event.data.version);
          }
        });
      });
    }

    // Capture install prompt for later
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      showInstallButton();
    });

    // Hide if already installed
    window.addEventListener('appinstalled', () => {
      const btn = document.querySelector('.pwa-install-btn');
      if (btn) btn.remove();
      const headerBtn = document.querySelector('.pwa-install-header');
      if (headerBtn) headerBtn.remove();
      deferredInstallPrompt = null;
      Toast.show('Als App installiert — du findest sie auf deinem Homescreen.');
    });

    // iOS-Detection: kein beforeinstallprompt → eigenes Hint
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isIOS && !isStandalone && isHub) {
      setTimeout(() => showIOSHint(), 2500);
    }
  }

  function showInstallButton() {
    // BUG-PWA-001: Floater + Header-Button parallel.
    // Floater bleibt für unaufmerksame User, Header-Button macht es prominent.

    // Header-Button: dezent, custom-SVG (Bildschirm + Pfeil-Down-In)
    const rightCluster = document.querySelector('.app-header .header-right');
    if (rightCluster && !rightCluster.querySelector('.pwa-install-header')) {
      const headerBtn = el('button', {
        class: 'pwa-install-header',
        attrs: { type: 'button', title: 'Als App installieren — auf Homescreen ablegen', 'aria-label': 'Als App installieren' },
        on: { click: () => triggerInstall() }
      });
      const ico = el('span', { class: 'pwa-install-header-icon', attrs: { 'aria-hidden': 'true' } });
      ico.appendChild(parseSVG(`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
        <rect x="2.5" y="3" width="15" height="11" rx="1.5"/>
        <line x1="2.5" y1="11" x2="17.5" y2="11"/>
        <line x1="7" y1="17" x2="13" y2="17"/>
        <line x1="10" y1="14" x2="10" y2="17"/>
        <path d="M10 5.5v3.5"/>
        <polyline points="8.2,7.3 10,9 11.8,7.3"/>
      </svg>`));
      headerBtn.appendChild(ico);
      headerBtn.appendChild(el('span', { class: 'pwa-install-header-label', text: 'Als App' }));
      // Insert before the meta cluster (after Mappe-trigger if present)
      const meta = rightCluster.querySelector('.header-meta');
      if (meta) rightCluster.insertBefore(headerBtn, meta);
      else rightCluster.appendChild(headerBtn);
    }

    // Floater bleibt parallel
    if (document.querySelector('.pwa-install-btn')) return;
    const btn = el('button', {
      class: 'pwa-install-btn',
      attrs: { type: 'button', 'aria-label': 'Als App auf Homescreen installieren' },
      on: { click: () => triggerInstall() }
    });
    const floatIco = el('span', { class: 'pwa-install-btn-icon', attrs: { 'aria-hidden': 'true' } });
    floatIco.appendChild(parseSVG(`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="3" width="15" height="11" rx="1.5"/>
      <line x1="2.5" y1="11" x2="17.5" y2="11"/>
      <line x1="7" y1="17" x2="13" y2="17"/>
      <line x1="10" y1="14" x2="10" y2="17"/>
      <path d="M10 5.5v3.5"/>
      <polyline points="8.2,7.3 10,9 11.8,7.3"/>
    </svg>`));
    btn.appendChild(floatIco);
    btn.appendChild(document.createTextNode(' Als App installieren'));
    document.body.appendChild(btn);
  }

  async function triggerInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice && choice.outcome === 'accepted') {
      const btn = document.querySelector('.pwa-install-btn');
      if (btn) btn.remove();
    }
    deferredInstallPrompt = null;
  }

  function showIOSHint() {
    if (sessionStorage.getItem('clawtools-ios-hint-shown')) return;
    if (document.querySelector('.pwa-ios-hint')) return;
    sessionStorage.setItem('clawtools-ios-hint-shown', '1');
    const card = el('div', { class: 'pwa-ios-hint' });
    const close = el('button', {
      class: 'pwa-ios-hint-close',
      attrs: { type: 'button', 'aria-label': 'Schließen' },
      text: '×',
      on: { click: () => card.remove() }
    });
    const title = el('div', { class: 'pwa-ios-hint-title', text: 'Als App auf Homescreen' });
    const body = el('div', { class: 'pwa-ios-hint-body' });
    body.appendChild(document.createTextNode('Tippe auf '));
    body.appendChild(el('strong', { text: 'Teilen' }));
    body.appendChild(document.createTextNode(' (das Quadrat mit Pfeil) und dann auf '));
    body.appendChild(el('strong', { text: 'Zum Home-Bildschirm' }));
    body.appendChild(document.createTextNode('. Schon hast du Tools immer griffbereit.'));
    card.appendChild(close);
    card.appendChild(title);
    card.appendChild(body);
    document.body.appendChild(card);
  }

  // ────────────────────────────────────────────────
  // whenMappeReady — for tools to wire Mappe-Dropzone-Alt + auto-save
  //
  // Usage in a tool's DOMContentLoaded:
  //   Shell.whenMappeReady((Mappe) => {
  //     Mappe.UI.injectDropzoneAlternative(dropzone, {
  //       accept: ['application/pdf'],
  //       onPick: (file) => addFiles([file])
  //     });
  //   });
  // ────────────────────────────────────────────────
  function whenMappeReady(callback, timeoutMs = 4000) {
    // BUG-HUB-001 Fix: poll bis ALLE 4 Mappe-globals geladen sind
    // (Mappe + Mappe.UI + Suggestions + MappeGrouped). Vorher prüfte nur
    // Mappe.UI — race-condition: callback feuerte bevor MappeGrouped da war,
    // Hub fiel auf fallback-render (große Image-Cards) zurück statt Smart-Suggest.
    // Idempotent: callback wird genau 1× aufgerufen (return after first match).
    const start = Date.now();
    function poll() {
      const allReady = global.Mappe && global.Mappe.UI && global.Suggestions && global.MappeGrouped;
      if (allReady) {
        try { callback(global.Mappe); } catch (e) { console.warn('[shell] whenMappeReady cb error:', e); }
        return;
      }
      if (Date.now() - start > timeoutMs) {
        // Soft-fallback: nach Timeout mit dem aufrufen was da ist (alte Semantik)
        if (global.Mappe && global.Mappe.UI) {
          try { callback(global.Mappe); } catch (e) { console.warn('[shell] whenMappeReady timeout-cb error:', e); }
        }
        return;
      }
      setTimeout(poll, 50);
    }
    poll();
  }

  // saveToMappe — convenience for tools: store a validated file in Mappe.
  // Silently no-ops if Mappe isn't loaded (graceful degrade).
  // De-dupes: if a file with same name+size already exists in Mappe,
  // returns the existing ID instead of creating a duplicate.
  // This handles the case where a file was auto-loaded from Mappe via URL-Param
  // and the tool re-saves it through its addFiles/loadFile pipeline.
  async function saveToMappe(file, sourceTool) {
    if (!global.Mappe || typeof global.Mappe.addFile !== 'function') return null;
    try {
      const existing = await global.Mappe.listFiles({});
      const dup = existing.find(f => f.name === file.name && f.size === file.size);
      if (dup) return dup.id;
      return await global.Mappe.addFile(file, sourceTool);
    } catch (e) {
      console.warn('[shell] saveToMappe failed:', e);
      return null;
    }
  }

  // ────────────────────────────────────────────────
  // Mappe Auto-Load via URL-Params (?from=mappe&ids=1,2,3)
  //
  // Tools register a handler:
  //   Shell.onMappeAutoLoad((files) => addFiles(files));
  // shell.js parses URL, fetches files from Mappe, invokes handler,
  // and injects a banner above tool's main work area.
  // ────────────────────────────────────────────────

  function parseMappeUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const from = params.get('from');
      const ids = (params.get('ids') || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      return { fromMappe: from === 'mappe', ids };
    } catch (e) {
      return { fromMappe: false, ids: [] };
    }
  }

  let _mappeAutoLoadHandler = null;
  let _mappeAutoLoadMode = 'multi'; // 'multi' = pass all files, 'single' = picker if N>1

  // onMappeAutoLoad(callback, opts?)
  //   opts.mode: 'multi' (default) → handler bekommt alle records
  //              'single' → bei N>1 Picker-Modal · User wählt 1 · handler bekommt [1]
  // BUG-MAPPE-002 Fix: Tools die nur 1 File nehmen (pdf-to-word, pdf-sign, …)
  // setzen mode:'single' damit User entscheidet bei mehrfach-Match.
  function onMappeAutoLoad(callback, opts) {
    if (typeof callback !== 'function') return;
    _mappeAutoLoadHandler = callback;
    _mappeAutoLoadMode = (opts && opts.mode) || 'multi';
    // Trigger right away if Mappe is already ready and URL has params
    tryAutoLoad();
  }

  async function tryAutoLoad() {
    if (!_mappeAutoLoadHandler) return;
    const { fromMappe, ids } = parseMappeUrlParams();
    if (!fromMappe || ids.length === 0) return;
    // Wait for Mappe (might still be loading)
    let waited = 0;
    while (!global.Mappe && waited < 4000) {
      await new Promise(r => setTimeout(r, 50));
      waited += 50;
    }
    if (!global.Mappe) return;
    const records = [];
    const recordMeta = []; // parallel to records — { id, name, size, type, addedAt } for picker UI
    for (const id of ids) {
      const rec = await global.Mappe.getFile(id);
      if (rec && rec.blob) {
        // Re-wrap blob as File-like object (with name, type, lastModified)
        try {
          const fileLike = new File([rec.blob], rec.name, {
            type: rec.type,
            lastModified: rec.addedAt
          });
          records.push(fileLike);
        } catch (e) {
          // Old browsers without File constructor — pass blob with name attached
          rec.blob.name = rec.name;
          records.push(rec.blob);
        }
        recordMeta.push({ id, name: rec.name, size: rec.size, type: rec.type, addedAt: rec.addedAt });
      }
    }
    if (records.length === 0) return;

    // BUG-MAPPE-002: Single-Mode-Tools mit N>1 → Picker statt silent-pick
    if (_mappeAutoLoadMode === 'single' && records.length > 1) {
      showMappePicker(records, recordMeta, (chosenIndex) => {
        try {
          _mappeAutoLoadHandler([records[chosenIndex]]);
          injectMappeAutoLoadBanner(1);
        } catch (e) {
          console.warn('[shell] onMappeAutoLoad handler error:', e);
        }
      });
      return;
    }

    try {
      _mappeAutoLoadHandler(records);
      injectMappeAutoLoadBanner(records.length);
    } catch (e) {
      console.warn('[shell] onMappeAutoLoad handler error:', e);
    }
  }

  // Mappe-Picker — bei N>1 Files in URL aber Tool akzeptiert nur 1.
  // Selbst-contained Modal (kein mappe-ui-Dependency) — klare Wahl mit
  // Datei-Liste und Cancel-Option.
  function showMappePicker(records, meta, onPick) {
    const fmtBytes = (b) => {
      if (b == null || isNaN(b)) return '—';
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
      return (b / (1024 * 1024)).toFixed(1) + ' MB';
    };
    const backdrop = el('div', { class: 'mappe-picker-backdrop' });
    const dialog = el('div', { class: 'mappe-picker-dialog', attrs: { role: 'dialog', 'aria-modal': 'true' } });

    // Head
    const head = el('div', { class: 'mappe-picker-head' });
    head.appendChild(el('div', { class: 'mappe-picker-eyebrow', text: `${records.length} Dateien aus deiner Mappe` }));
    head.appendChild(el('h3', { class: 'mappe-picker-title', text: 'Welche soll dieses Werkzeug nehmen?' }));
    head.appendChild(el('p', { class: 'mappe-picker-sub', text: 'Dieses Werkzeug verarbeitet eine Datei pro Durchgang. Wähle aus deiner Mappe die richtige aus.' }));
    dialog.appendChild(head);

    // List
    const list = el('div', { class: 'mappe-picker-list' });
    records.forEach((rec, idx) => {
      const m = meta[idx] || {};
      const item = el('button', {
        class: 'mappe-picker-item',
        attrs: { type: 'button' },
        on: {
          click: () => {
            backdrop.remove();
            document.removeEventListener('keydown', escHandler);
            onPick(idx);
          }
        }
      });
      // Icon
      const ico = el('span', { class: 'mappe-picker-item-icon', attrs: { 'aria-hidden': 'true' } });
      ico.appendChild(parseSVG(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`));
      item.appendChild(ico);
      // Body
      const body = el('div', { class: 'mappe-picker-item-body' });
      body.appendChild(el('div', { class: 'mappe-picker-item-name', text: m.name || rec.name || `Datei ${idx + 1}` }));
      body.appendChild(el('div', { class: 'mappe-picker-item-meta', text: fmtBytes(m.size || rec.size) }));
      item.appendChild(body);
      // Arrow
      const arrow = el('span', { class: 'mappe-picker-item-arrow', attrs: { 'aria-hidden': 'true' } });
      arrow.appendChild(parseSVG(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>`));
      item.appendChild(arrow);
      list.appendChild(item);
    });
    dialog.appendChild(list);

    // Foot — cancel
    const foot = el('div', { class: 'mappe-picker-foot' });
    foot.appendChild(el('button', {
      class: 'mappe-picker-cancel',
      attrs: { type: 'button' },
      text: 'Abbrechen',
      on: {
        click: () => {
          backdrop.remove();
          document.removeEventListener('keydown', escHandler);
        }
      }
    }));
    dialog.appendChild(foot);

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('show'));

    function escHandler(e) {
      if (e.key === 'Escape') {
        backdrop.remove();
        document.removeEventListener('keydown', escHandler);
      }
    }
    document.addEventListener('keydown', escHandler);
  }

  function injectMappeAutoLoadBanner(count) {
    // Find a sensible place — before the first .work-grid or .card
    const main = document.querySelector('.app-main');
    if (!main) return;
    if (main.querySelector('.mappe-autoload-banner')) return; // already injected
    const target = main.querySelector('.work-grid') || main.querySelector('.card') || main.children[0];
    if (!target) return;

    const banner = el('div', { class: 'mappe-autoload-banner', attrs: { role: 'status' } });
    const ico = el('span', { class: 'mappe-autoload-banner-icon', attrs: { 'aria-hidden': 'true' } });
    ico.appendChild(parseSVG(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="20 6 9 17 4 12"/></svg>`));
    banner.appendChild(ico);
    const text = el('div', { class: 'mappe-autoload-banner-text' });
    const word = count === 1 ? 'Datei' : 'Dateien';
    const strong = el('strong', { text: `${count} ${word} aus deiner Mappe geladen.` });
    text.appendChild(strong);
    text.appendChild(el('small', { text: 'Du kannst einzelne mit × entfernen — sie bleiben in deiner Mappe für später.' }));
    banner.appendChild(text);
    main.insertBefore(banner, target);
  }

  // ────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // BUG-RESET-001 Cross-Tool-Cluster: Auto-Inject "× verwerfen" im File-Header
  //
  // Problem: jedes Tool hat einen #btnReset, aber NUR innerhalb .result —
  // die ist hidden bis Processing fertig. Vor Processing kann User
  // nicht zur Auswahl zurück.
  //
  // Lösung: shell.js beobachtet #editorView. Wird editor visible →
  // injiziert einen X-Button rechts im ersten .card-head der den
  // tool-spezifischen #btnReset triggert.
  //
  // Idempotent: Mehrfach-Trigger vom Observer bauen Button NICHT doppelt
  // (early-return wenn .card-head-reset schon existiert).
  // ─────────────────────────────────────────────────────────────
  function setupAutoReset() {
    const editor = document.getElementById('editorView');
    if (!editor) return; // Tool ohne editorView-Pattern (z.B. pdf-merger) — skip

    const tryAttach = () => {
      const visible = editor.style.display !== 'none';
      if (!visible) return;
      const btnReset = document.getElementById('btnReset');
      if (!btnReset) return;
      const cardHead = editor.querySelector('.card-head');
      if (!cardHead) return;
      if (cardHead.querySelector('.card-head-reset')) return; // idempotent

      const btn = el('button', {
        class: 'card-head-reset',
        attrs: { type: 'button', title: 'Datei verwerfen · neue laden', 'aria-label': 'Datei verwerfen' },
        on: { click: (e) => { e.preventDefault(); btnReset.click(); } }
      });
      btn.appendChild(parseSVG('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'));
      cardHead.appendChild(btn);
    };

    tryAttach();
    const observer = new MutationObserver(tryAttach);
    observer.observe(editor, { attributes: true, attributeFilter: ['style'] });
  }

  // ─────────────────────────────────────────────────────────────
  // BUG-IPHONE-001 Cross-Tool-Cluster: HEIC-Detection + freundliches Routing
  //
  // iPhone 14+ Camera Roll liefert HEIC (Apples HEIF-Container).
  // Die meisten image-Tools nutzen <img> + Canvas-Decode; das bricht
  // auf nicht-Safari-Browsern und produziert auf iOS-Safari subtile
  // Canvas-Fehler. Kein Tool routet User dahin wo's klappt.
  //
  // Lösung:
  //   const heicHandled = Shell.handleHeicIfNeeded(file, 'bg-remove');
  //   if (heicHandled) return;  // Tool-loadFile abbrechen
  //
  // → speichert File in Mappe + Toast + redirect zu /heic-zu-jpg.
  // User konvertiert dort, kommt mit JPG zurück (in Mappe).
  // ─────────────────────────────────────────────────────────────
  // Format-Klassifikation für iPhone/Kamera-Outputs die unsere Tools nicht
  // direkt verarbeiten können. User-friendly hint + ggf. Konvertierungs-Route.
  function classifyImageFile(file) {
    if (!file) return null;
    const t = (file.type || '').toLowerCase();
    const n = (file.name || '').toLowerCase();
    // iPhone-HEIC/HEIF
    if (t === 'image/heic' || t === 'image/heif' || /\.(heic|heif)$/.test(n)) {
      return {
        kind: 'heic',
        label: 'iPhone-Foto (HEIC)',
        route: '/heic-zu-jpg/',
        message: 'iPhone-Foto erkannt — erst zu JPG umwandeln, danach hier wieder rein.'
      };
    }
    // iPhone-ProRAW oder andere DNG-RAW
    if (t === 'image/x-adobe-dng' || /\.dng$/.test(n)) {
      return {
        kind: 'dng',
        label: 'iPhone-ProRAW (DNG)',
        route: null, // wir haben (noch) keinen DNG-Konverter
        message: 'iPhone-ProRAW (DNG) wird noch nicht unterstützt. Tipp: Im iPhone das Foto öffnen → Teilen-Symbol → unten "Foto-Optionen" → ProRAW-Schalter aus, dann erneut speichern. Oder: Foto in der Fotos-App in JPG exportieren.'
      };
    }
    // Andere RAW-Formate (Canon, Nikon, Sony, Fuji)
    if (/\.(cr2|cr3|nef|nrw|arw|raf|rw2|orf|raw)$/.test(n) || /image\/x-(canon|nikon|sony|fuji|olympus|panasonic)-/.test(t)) {
      return {
        kind: 'raw',
        label: 'Kamera-RAW',
        route: null,
        message: 'Kamera-RAW-Format wird noch nicht unterstützt. Bitte als JPG exportieren und erneut versuchen.'
      };
    }
    // TIFF — manche Browser können's, manche nicht. Lieber Hinweis.
    if (t === 'image/tiff' || /\.(tif|tiff)$/.test(n)) {
      return {
        kind: 'tiff',
        label: 'TIFF',
        route: null,
        message: 'TIFF wird je nach Browser unterschiedlich verarbeitet. Falls es klemmt: bitte als JPG/PNG exportieren.'
      };
    }
    return null; // OK für Tool
  }

  function isHeic(file) {
    const c = classifyImageFile(file);
    return c && c.kind === 'heic';
  }

  // BUG-IPHONE-001 + DNG-Erweiterung: handle alle iPhone/RAW-Formate.
  // Returns true wenn das File NICHT vom Tool weiterverarbeitet werden soll
  // (Tool-loadFile sollte dann return).
  function handleHeicIfNeeded(file, currentTool) {
    const c = classifyImageFile(file);
    if (!c) return false;
    // Wir ARE der Konverter selbst → durchlassen
    if (currentTool === 'heic-zu-jpg' && c.kind === 'heic') return false;

    Toast.show(c.message, true);

    if (c.route) {
      // Auto-Route nur bei HEIC (haben Konverter)
      if (typeof saveToMappe === 'function') {
        saveToMappe(file, currentTool || 'unknown').catch(() => {});
      }
      setTimeout(() => { window.location.href = c.route; }, 2200);
    }
    return true;
  }

  // DNG = TIFF-basierter Container, enthält fast immer ein eingebettetes
  // JPEG-Preview in voller Auflösung (Apple-ProRAW, Sony, Canon CR3, …).
  // Wir suchen JPEG-SOI/EOI-Marker (FFD8FF…FFD9) und nehmen den GRÖSSTEN
  // gefundenen Stream → das ist typisch das full-resolution Preview.
  // Idempotent: pure function, gleicher Input → gleicher Output.
  async function extractEmbeddedJpegFromDng(file) {
    try {
      const buf = await file.arrayBuffer();
      const u8 = new Uint8Array(buf);
      let largestStart = -1, largestEnd = -1;
      let i = 0;
      while (i < u8.length - 3) {
        if (u8[i] === 0xFF && u8[i + 1] === 0xD8 && u8[i + 2] === 0xFF) {
          const start = i;
          let j = start + 2;
          while (j < u8.length - 1) {
            if (u8[j] === 0xFF && u8[j + 1] === 0xD9) {
              const end = j + 2;
              const size = end - start;
              if (size > (largestEnd - largestStart)) {
                largestStart = start;
                largestEnd = end;
              }
              i = end;
              break;
            }
            j++;
          }
          if (j >= u8.length - 1) i++;
        } else {
          i++;
        }
      }
      if (largestStart < 0 || (largestEnd - largestStart) < 4096) return null;
      return new Blob([u8.slice(largestStart, largestEnd)], { type: 'image/jpeg' });
    } catch (e) {
      console.warn('[shell] extractEmbeddedJpegFromDng failed:', e);
      return null;
    }
  }

  // Höhere-Ebene-Helper: bekommt ein File, gibt ein TOOL-VERARBEITBARES
  // File zurück (oder null wenn nicht möglich).
  // - JPEG/PNG/WebP/GIF: durchgereicht
  // - DNG: extrahiert eingebettetes JPEG → File('foto.jpg')
  // - HEIC: Auto-Route zu /heic-zu-jpg/ (return null)
  // - RAW/TIFF: Toast mit Tipp (return null)
  // Tools nutzen: const usable = await Shell.tryConvertImage(file, 'tool-id');
  async function tryConvertImage(file, currentTool) {
    const c = classifyImageFile(file);
    if (!c) return file; // bereits unterstütztes Format

    if (c.kind === 'dng') {
      Toast.show('iPhone-ProRAW erkannt — extrahiere eingebettetes JPEG…');
      const jpeg = await extractEmbeddedJpegFromDng(file);
      if (jpeg && jpeg.size > 4096) {
        const newName = (file.name || 'foto').replace(/\.dng$/i, '') + '.jpg';
        try {
          return new File([jpeg], newName, { type: 'image/jpeg', lastModified: Date.now() });
        } catch (e) {
          jpeg.name = newName;
          return jpeg;
        }
      }
      Toast.show('Kein eingebettetes JPEG in der DNG-Datei gefunden. ' + c.message, true);
      return null;
    }

    if (c.kind === 'heic') {
      if (currentTool === 'heic-zu-jpg') return file;
      if (typeof saveToMappe === 'function') saveToMappe(file, currentTool || 'unknown').catch(() => {});
      Toast.show(c.message, true);
      setTimeout(() => { window.location.href = c.route; }, 2200);
      return null;
    }

    if (c.kind === 'raw' || c.kind === 'tiff') {
      Toast.show(c.message, true);
      return null;
    }

    return file;
  }

  // BUG-MAPPE-003: BFCache-Restore-Helper.
  // Browser-Back-Forward-Cache restored die Page mit altem DOM-Snapshot.
  // DOMContentLoaded feuert dabei NICHT — pageshow mit persisted=true ist
  // das richtige Signal. Hub + Tools können diesen Helper für ihren
  // refresh-callback nutzen statt selbst pageshow zu wiren.
  function onBFCacheRestore(callback) {
    if (typeof callback !== 'function') return;
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        try { callback(); } catch (err) { console.warn('[shell] bfCache callback error:', err); }
      }
    });
  }

  global.Shell = {
    init, Toast, Tour, parseSVG, el,
    whenMappeReady, saveToMappe,
    onMappeAutoLoad, parseMappeUrlParams, injectMappeAutoLoadBanner,
    onBFCacheRestore,
    // BUG-IPHONE-001 / DNG: Cross-Tool-Format-Helpers
    isHeic, classifyImageFile, handleHeicIfNeeded,
    extractEmbeddedJpegFromDng, tryConvertImage
  };
})(window);
