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

    const section = el('section', {
      class: 'privacy', attrs: { 'aria-labelledby': 'privacyTitle' }
    });
    const iconWrap = el('div', { class: 'privacy-icon', attrs: { 'aria-hidden': 'true' } });
    iconWrap.appendChild(parseSVG(PRIVACY_ICON_SVG));

    const body = el('div', { class: 'privacy-body' });
    const h3 = el('h3', { attrs: { id: 'privacyTitle' } });
    h3.appendChild(document.createTextNode('Datenschutz '));
    h3.appendChild(el('span', { class: 'tag', text: 'DSGVO-konform' }));
    body.appendChild(h3);

    // Use DOM construction (not innerHTML) for safety
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
     'Mit Schließen des Tabs werden alle geladenen Dateien aus dem Speicher entfernt.'
    ].forEach(t => ul.appendChild(el('li', { text: t })));
    body.appendChild(ul);

    section.appendChild(iconWrap);
    section.appendChild(body);
    main.appendChild(section);
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

      Tour._positionTooltip(target, step.side || 'bottom');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    _positionTooltip(target, side) {
      const r = target.getBoundingClientRect();
      const tt = tourState.tooltip;
      const ttW = 320;
      const margin = 16;
      const sx = window.scrollX, sy = window.scrollY;
      let top, left;

      switch (side) {
        case 'top':
          top = r.top + sy - tt.offsetHeight - margin;
          left = r.left + sx + r.width / 2 - ttW / 2;
          break;
        case 'left':
          top = r.top + sy + r.height / 2 - tt.offsetHeight / 2;
          left = r.left + sx - ttW - margin;
          break;
        case 'right':
          top = r.top + sy + r.height / 2 - tt.offsetHeight / 2;
          left = r.right + sx + margin;
          break;
        case 'bottom':
        default:
          top = r.bottom + sy + margin;
          left = r.left + sx + r.width / 2 - ttW / 2;
      }
      left = Math.max(margin, Math.min(left, window.innerWidth - ttW - margin));
      top = Math.max(margin + sy, top);
      tt.style.top = top + 'px';
      tt.style.left = left + 'px';
    },

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
  // Init
  // ────────────────────────────────────────────────
  function init(opts = {}) {
    const cfg = {
      tag: opts.tag || null,
      tour: opts.tour !== false,
      privacy: opts.privacy !== false,
      footer: opts.footer !== false,
      toolName: opts.toolName || ''
    };
    injectHeader({ tag: cfg.tag, tour: cfg.tour });
    if (cfg.privacy) injectPrivacy();
    if (cfg.footer) injectFooter(cfg.toolName);
    if (cfg.tour) {
      checkUrlTour();
      if (!opts.isHub) {
        setTimeout(() => Tour.maybeShowWelcome(), 1500);
      }
    }
  }

  // ────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────
  global.Shell = { init, Toast, Tour, parseSVG, el };
})(window);
