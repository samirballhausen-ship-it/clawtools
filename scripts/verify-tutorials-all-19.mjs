// Verify alle 19 Tools — Tour-Tooltip + Tutorial-Texte — Mobile + Desktop
import { chromium, devices } from 'playwright';

const BASE = 'http://localhost:8772';
const TOOLS = [
  'bg-remove', 'csv-edit', 'docx-zu-pdf', 'exif-rename', 'exif-strip',
  'heic-zu-jpg', 'images-compress', 'images-to-pdf', 'pdf-compress',
  'pdf-merger', 'pdf-ocr', 'pdf-redact', 'pdf-sign', 'pdf-splitter',
  'pdf-to-word', 'pdf-watermark', 'qr-code', 'video-compress', 'video-zu-gif',
];

// Tech-Wörter die NICHT mehr im Tutorial-Text vorkommen sollen
const FORBIDDEN_TERMS = [
  /KI[- ]Modell/i, /Mergereihenfolge/i,
  /Fehlerkorrektur \([QH]/i, /OCR jagen/i,
  /als JPEG rendern/i, /Tesseract/i, /WASM/i,
  /ONNX/i, /Worker/i, /\bAPI\b/i,
];

async function checkTool(browser, viewport, tool) {
  const ctx = await browser.newContext({ ...viewport, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));

  try {
    await page.goto(`${BASE}/${tool}/index.html`, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForTimeout(800);

    const result = await page.evaluate(() => {
      return {
        h1: document.querySelector('h1')?.textContent?.trim() || '',
        tutorial: window.__tutorial || [],
        hasShell: !!window.Shell,
      };
    });

    const tutorialText = result.tutorial.map(s => `${s.title}: ${s.text}`).join(' | ');
    const techHits = FORBIDDEN_TERMS.filter(rx => rx.test(tutorialText));

    // Tour starten
    const tourOk = await page.evaluate(() => {
      try {
        window.Shell?.Tour?.start?.(window.__tutorial || []);
        return true;
      } catch (e) { return false; }
    });
    await page.waitForTimeout(800);

    const tooltip = await page.evaluate(() => {
      const t = document.querySelector('.tour-tooltip');
      if (!t) return null;
      const r = t.getBoundingClientRect();
      const cs = getComputedStyle(t);
      return {
        position: cs.position,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        right: Math.round(r.right),
        width: Math.round(r.width),
        height: Math.round(r.height),
        vw: window.innerWidth,
        vh: window.innerHeight,
      };
    });

    return {
      tool,
      h1: result.h1,
      tutorialSteps: result.tutorial.length,
      techHits: techHits.map(rx => rx.source),
      tourFired: tourOk && !!tooltip,
      tooltipFixed: tooltip?.position === 'fixed',
      tooltipInView: tooltip ? (tooltip.bottom <= tooltip.vh + 5 && tooltip.top >= -5 && tooltip.right <= tooltip.vw + 5) : false,
      tooltip,
      pageErrors: errors.length,
    };
  } finally {
    await ctx.close();
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const viewports = {
    Mobile: devices['iPhone 13'],
    Desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  };

  for (const [name, vp] of Object.entries(viewports)) {
    console.log(`\n━━━ ${name} ━━━`);
    for (const tool of TOOLS) {
      const r = await checkTool(browser, vp, tool);
      const ok = r.tourFired && r.tooltipFixed && r.tooltipInView && r.techHits.length === 0 && r.tutorialSteps >= 4;
      const flags = [];
      if (!r.tourFired) flags.push('TOUR-FAIL');
      if (!r.tooltipFixed) flags.push(`pos=${r.tooltip?.position || 'none'}`);
      if (!r.tooltipInView) flags.push(`OOB t=${r.tooltip?.top} b=${r.tooltip?.bottom}/${r.tooltip?.vh}`);
      if (r.techHits.length) flags.push(`TECH=${r.techHits.join(',')}`);
      if (r.tutorialSteps < 4) flags.push(`STEPS=${r.tutorialSteps}`);
      if (r.pageErrors) flags.push(`PERR=${r.pageErrors}`);
      console.log(`  ${ok ? '✓' : '✗'} ${tool.padEnd(18)} steps=${r.tutorialSteps} ${flags.join(' ')}`);
    }
  }

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
