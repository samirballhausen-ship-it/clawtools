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
     ['AGB', '/agb'],
     ['GitHub', 'https://github.com/samirballhausen-ship-it/clawtools']
    ].forEach(([txt, href]) => {
      const a = el('a', {
        text: txt,
        attrs: { href, ...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }
      });
      nav.appendChild(a);
    });
    inner.appendChild(nav);

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

      const target = document.querySelector(step.target);
      if (!target) return Tour.next();

      const r = target.getBoundingClientRect();
      const pad = 6;
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
      checkUrlTour();
      if (!opts.isHub) {
        setTimeout(() => Tour.maybeShowWelcome(), 1500);
      }
    }
    setupPWA(opts.isHub);
    if (cfg.mappe) setupMappeUI();
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
    if (document.querySelector('.pwa-install-btn')) return;
    const btn = el('button', {
      class: 'pwa-install-btn',
      attrs: { type: 'button', 'aria-label': 'Als App auf Homescreen installieren' },
      on: { click: () => triggerInstall() }
    });
    const ico = el('span', { attrs: { 'aria-hidden': 'true' }, text: '⤓' });
    btn.appendChild(ico);
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
    const start = Date.now();
    function poll() {
      if (global.Mappe && global.Mappe.UI) {
        try { callback(global.Mappe); } catch (e) { console.warn('[shell] whenMappeReady cb error:', e); }
        return;
      }
      if (Date.now() - start > timeoutMs) return;
      setTimeout(poll, 50);
    }
    poll();
  }

  // saveToMappe — convenience for tools: store a validated file in Mappe.
  // Silently no-ops if Mappe isn't loaded (graceful degrade).
  async function saveToMappe(file, sourceTool) {
    if (!global.Mappe || typeof global.Mappe.addFile !== 'function') return null;
    try {
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
  function onMappeAutoLoad(callback) {
    if (typeof callback !== 'function') return;
    _mappeAutoLoadHandler = callback;
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
      }
    }
    if (records.length === 0) return;
    try {
      _mappeAutoLoadHandler(records);
      injectMappeAutoLoadBanner(records.length);
    } catch (e) {
      console.warn('[shell] onMappeAutoLoad handler error:', e);
    }
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
  global.Shell = {
    init, Toast, Tour, parseSVG, el,
    whenMappeReady, saveToMappe,
    onMappeAutoLoad, parseMappeUrlParams, injectMappeAutoLoadBanner
  };
})(window);
