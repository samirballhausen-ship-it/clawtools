/* FFmpeg.wasm loader — SELF-HOSTED in /shared/ffmpeg/.
 *
 * Hintergrund: @ffmpeg/ffmpeg via CDN (jsdelivr +esm) erstellt intern einen
 * Worker mit `new URL('./worker.js', import.meta.url)` — der Worker URL ist
 * dann cross-origin zum Tool-Domain. Browser blockt `new Worker(crossOrigin)`.
 * Workaround mit toBlobURL klappt für coreURL/wasmURL, aber der Init-Handshake
 * zwischen Main-Thread und Worker hängt manchmal.
 *
 * Lösung: alle ffmpeg-Files lokal in /shared/ffmpeg/ ablegen — same-origin.
 * Worker-Konstruktion klappt nativ, kein Blob-URL-Trick nötig.
 *
 * Files (~32 MB total, gecacht durch Service Worker und Browser):
 * - /shared/ffmpeg/ffmpeg.js (entry)
 * - /shared/ffmpeg/classes.js, const.js, errors.js, types.js, utils.js, worker.js
 * - /shared/ffmpeg/util.js, util-errors.js, util-types.js (@ffmpeg/util)
 * - /shared/ffmpeg/ffmpeg-core.js, ffmpeg-core.wasm
 */

let cached = null;

export async function loadFFmpeg(progress) {
  if (cached) return cached;

  try {
    progress?.('Lade Werkzeug…');
    // Self-hosted import — same-origin, kein Cross-Origin-Worker-Block
    const { FFmpeg } = await import('/shared/ffmpeg/classes.js');
    const utilMod = await import('/shared/ffmpeg/util.js');
    const { fetchFile } = utilMod;

    progress?.('Initialisiere…');
    const ffmpeg = new FFmpeg();

    progress?.('Lade Video-Engine…');
    // coreURL und wasmURL same-origin: kein toBlobURL nötig
    await ffmpeg.load({
      coreURL: '/shared/ffmpeg/ffmpeg-core.js',
      wasmURL: '/shared/ffmpeg/ffmpeg-core.wasm',
    });

    progress?.('Bereit.');
    cached = { ffmpeg, fetchFile, exec: ffmpeg['exec'].bind(ffmpeg) };
    return cached;
  } catch (e) {
    console.error('[ffmpeg-loader] failed:', e);
    throw new Error(`Video-Werkzeug konnte nicht geladen werden: ${e.message ?? 'Unbekannt'}`);
  }
}

export function isCrossOriginIsolated() {
  return typeof self !== 'undefined' && self.crossOriginIsolated === true;
}
