/* FFmpeg.wasm loader — bypasses cross-origin Worker block via Blob-URL.
 *
 * Background: @ffmpeg/ffmpeg v0.12.x internally constructs a Worker via
 * `new URL('./worker.js', import.meta.url)`. If the ESM import comes from
 * cross-origin (jsdelivr), browsers refuse to construct the Worker.
 *
 * Fix: pre-fetch the class-worker JS as Blob → same-origin URL → works.
 *
 * Exports a single async function `loadFFmpeg(opts)` returning { ffmpeg, fetchFile }.
 * Multi-CDN fallback for resilience.
 */

const FFMPEG_VERSION = '0.12.10';
const UTIL_VERSION = '0.12.1';
const CORE_VERSION = '0.12.6';

const CDN_BASES = [
  'https://cdn.jsdelivr.net/npm',
  'https://unpkg.com',
];

let cached = null;

export async function loadFFmpeg(progress) {
  if (cached) return cached;

  let lastErr;
  for (const cdn of CDN_BASES) {
    try {
      progress?.('Lade Module…');
      const ffmpegMod = await import(`${cdn}/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/+esm`);
      const utilMod = await import(`${cdn}/@ffmpeg/util@${UTIL_VERSION}/+esm`);

      const FFmpegClass = ffmpegMod.FFmpeg;
      const { toBlobURL, fetchFile } = utilMod;

      const ffmpeg = new FFmpegClass();

      progress?.('Lade Worker…');
      // The class worker — same-origin via blob, bypasses CORS block
      const classWorkerURL = await toBlobURL(
        `${cdn}/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/esm/worker.js`,
        'text/javascript'
      );

      progress?.('Lade Video-Werkzeug…');
      const coreBase = `${cdn}/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
      const coreURL = await toBlobURL(`${coreBase}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm');

      progress?.('Initialisiere…');
      await ffmpeg.load({ coreURL, wasmURL, classWorkerURL });

      cached = { ffmpeg, fetchFile, exec: ffmpeg['exec'].bind(ffmpeg) };
      return cached;
    } catch (e) {
      console.warn('[ffmpeg-loader] CDN failed:', cdn, e.message);
      lastErr = e;
    }
  }

  throw new Error(`Video-Werkzeug konnte nicht geladen werden: ${lastErr?.message ?? 'Unbekannt'}`);
}

export function isCrossOriginIsolated() {
  return typeof self !== 'undefined' && self.crossOriginIsolated === true;
}
