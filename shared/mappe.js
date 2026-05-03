/* CLAWBUIS Tools — Datei-Mappe (Cross-Tool File Library)
 *
 * Persistenter IndexedDB-basierter File-Speicher, der über alle Tools
 * hinweg sichtbar ist. 100% lokal — keine Server-Speicherung.
 *
 * Public API (window.Mappe):
 *   addFile(file, sourceTool) → fileId
 *   listFiles({ types, limit, offset, sort }) → File[]  (ohne blob)
 *   getFile(fileId) → File-record (mit blob) | null
 *   deleteFile(fileId) → boolean
 *   clearAll() → number (Anzahl gelöschter Files)
 *   getQuota() → { used, total, percent, fileCount, softLimit }
 *   onChange(callback) → unsubscribe-Funktion
 *
 * SAFETY: keine innerHTML, keine eval, alle Operationen Promise-basiert.
 * BroadcastChannel sendet Live-Events an andere Tabs derselben Origin —
 * plus same-tab event-bus für Komponenten im selben Tab.
 */
(function (global) {
  'use strict';

  const DB_NAME = 'clawtools-mappe';
  const DB_VERSION = 1;
  const STORE_FILES = 'files';
  const STORE_META = 'meta';
  const CHANNEL_NAME = 'clawtools-mappe';
  const SOFT_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB

  // ────────────────────────────────────────────────
  // Native IndexedDB Promise-Wrappers
  // ────────────────────────────────────────────────
  let _dbPromise = null;

  function openDb() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          const store = db.createObjectStore(STORE_FILES, { keyPath: 'id', autoIncrement: true });
          store.createIndex('addedAt', 'addedAt', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
      req.onblocked = () => reject(new Error('IndexedDB blocked — schließe andere Tabs'));
    });
    return _dbPromise;
  }

  function reqPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function txPromise(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  // ────────────────────────────────────────────────
  // Event Bus — local listeners + BroadcastChannel
  // ────────────────────────────────────────────────
  const _listeners = [];
  let _channel = null;

  function getChannel() {
    if (_channel !== null) return _channel;
    if (typeof BroadcastChannel === 'undefined') { _channel = false; return false; }
    try {
      _channel = new BroadcastChannel(CHANNEL_NAME);
      _channel.addEventListener('message', (e) => _fireLocal(e.data));
    } catch (e) {
      _channel = false;
    }
    return _channel;
  }

  function _fireLocal(event) {
    _listeners.slice().forEach((cb) => {
      try { cb(event); } catch (e) { console.warn('[mappe] listener error:', e); }
    });
  }

  function _emit(event) {
    _fireLocal(event);
    const ch = getChannel();
    if (ch) {
      try { ch.postMessage(event); } catch (e) { console.warn('[mappe] broadcast failed:', e); }
    }
  }

  // ────────────────────────────────────────────────
  // Type-Filter Helper (mime-glob matching)
  // ────────────────────────────────────────────────
  function typeMatches(fileType, patterns) {
    if (!patterns || patterns.length === 0) return true;
    const t = (fileType || '').toLowerCase();
    return patterns.some((p) => {
      const pat = p.toLowerCase();
      if (pat === '*' || pat === '*/*') return true;
      if (pat.endsWith('/*')) {
        const prefix = pat.slice(0, -2);
        return t.startsWith(prefix + '/');
      }
      return t === pat;
    });
  }

  // ────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────

  async function addFile(file, sourceTool = 'unknown') {
    if (!file || typeof file.arrayBuffer !== 'function') {
      throw new Error('addFile: Blob/File required');
    }
    const db = await openDb();
    const now = Date.now();
    const record = {
      name: file.name || `file-${now}`,
      type: file.type || 'application/octet-stream',
      size: file.size,
      blob: file,
      addedAt: now,
      lastUsed: now,
      sourceTool: sourceTool || 'unknown'
    };
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const id = await reqPromise(tx.objectStore(STORE_FILES).add(record));
    await txPromise(tx);
    _emit({ type: 'add', fileId: id, name: record.name, size: record.size, fileType: record.type });
    return id;
  }

  async function listFiles(opts = {}) {
    const { types = null, limit = Infinity, offset = 0, sort = 'addedAt' } = opts;
    const db = await openDb();
    const tx = db.transaction(STORE_FILES, 'readonly');
    const all = await reqPromise(tx.objectStore(STORE_FILES).getAll());

    // Strip blob from list response — caller fetches via getFile
    let items = all.map((rec) => ({
      id: rec.id,
      name: rec.name,
      type: rec.type,
      size: rec.size,
      addedAt: rec.addedAt,
      lastUsed: rec.lastUsed,
      sourceTool: rec.sourceTool
    }));

    if (types) items = items.filter((rec) => typeMatches(rec.type, types));

    items.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'size') return b.size - a.size;
      if (sort === 'lastUsed') return b.lastUsed - a.lastUsed;
      return b.addedAt - a.addedAt;
    });

    if (offset > 0) items = items.slice(offset);
    if (limit !== Infinity) items = items.slice(0, limit);
    return items;
  }

  async function getFile(fileId) {
    if (typeof fileId !== 'number') fileId = parseInt(fileId, 10);
    if (isNaN(fileId)) return null;
    const db = await openDb();
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const rec = await reqPromise(store.get(fileId));
    if (!rec) {
      await txPromise(tx);
      return null;
    }
    rec.lastUsed = Date.now();
    store.put(rec);
    await txPromise(tx);
    return rec;
  }

  async function deleteFile(fileId) {
    if (typeof fileId !== 'number') fileId = parseInt(fileId, 10);
    if (isNaN(fileId)) return false;
    const db = await openDb();
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const existing = await reqPromise(store.get(fileId));
    if (!existing) {
      await txPromise(tx);
      return false;
    }
    store.delete(fileId);
    await txPromise(tx);
    _emit({ type: 'delete', fileId });
    return true;
  }

  async function clearAll() {
    const db = await openDb();
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const count = await reqPromise(store.count());
    store.clear();
    await txPromise(tx);
    _emit({ type: 'clear', count });
    return count;
  }

  async function getQuota() {
    const db = await openDb();
    const tx = db.transaction(STORE_FILES, 'readonly');
    const all = await reqPromise(tx.objectStore(STORE_FILES).getAll());
    const fileCount = all.length;
    const ourUsage = all.reduce((sum, rec) => sum + (rec.size || 0), 0);

    let used = ourUsage;
    let total = SOFT_LIMIT_BYTES * 4; // safe default if estimate() unavailable
    if (navigator.storage && typeof navigator.storage.estimate === 'function') {
      try {
        const est = await navigator.storage.estimate();
        // Browser-Estimate kann unter unserer Summe liegen (estimate ist approx)
        used = Math.max(est.usage || 0, ourUsage);
        if (est.quota) total = est.quota;
      } catch (e) { /* ignore — defaults bleiben */ }
    }

    const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    return { used, total, percent, fileCount, softLimit: SOFT_LIMIT_BYTES };
  }

  function onChange(callback) {
    if (typeof callback !== 'function') return () => {};
    getChannel(); // ensure channel is wired up
    _listeners.push(callback);
    return () => {
      const idx = _listeners.indexOf(callback);
      if (idx >= 0) _listeners.splice(idx, 1);
    };
  }

  // ────────────────────────────────────────────────
  // Format Helpers (für UI)
  // ────────────────────────────────────────────────
  function formatBytes(b) {
    if (b == null || isNaN(b)) return '—';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
    return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function formatRelativeTime(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} Min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `vor ${h} Std`;
    const d = Math.floor(h / 24);
    if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`;
    const w = Math.floor(d / 7);
    if (w < 5) return `vor ${w} Woche${w === 1 ? '' : 'n'}`;
    return new Date(ts).toLocaleDateString('de-DE');
  }

  function getKindIcon(type, name) {
    const t = (type || '').toLowerCase();
    const n = (name || '').toLowerCase();
    if (t.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif|svg|bmp)$/.test(n)) return 'image';
    if (t === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf';
    if (t.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/.test(n)) return 'video';
    if (t.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac)$/.test(n)) return 'audio';
    if (t.includes('word') || /\.(doc|docx|odt)$/.test(n)) return 'doc';
    if (t.includes('sheet') || t === 'text/csv' || /\.(xls|xlsx|csv|ods)$/.test(n)) return 'sheet';
    return 'file';
  }

  // ────────────────────────────────────────────────
  // Public API export
  // ────────────────────────────────────────────────
  global.Mappe = {
    addFile,
    listFiles,
    getFile,
    deleteFile,
    clearAll,
    getQuota,
    onChange,
    typeMatches,
    formatBytes,
    formatRelativeTime,
    getKindIcon,
    SOFT_LIMIT_BYTES
  };
})(window);
