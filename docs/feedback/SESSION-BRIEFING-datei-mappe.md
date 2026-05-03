# Session-Briefing: Globale Datei-Mappe (Cross-Tool File Library)

> **Status:** Spec ready für autonome Build-Session.
> **Erwartete Dauer:** 4-8 Stunden autonomes Arbeiten.
> **Repo:** `C:\Apps\CLAWBUIS\projects\tools` (lokales git-Repo, push-deploy zu `tools.clawbuis.com` via Vercel).

---

## Was Samir will (Original-Wortlaut)

> "Ich möchte es hier wirklich über alle Apps hinweg und auch in der Startseite eben oben diese Datei Mappe nenn ich es haben. Wo ich alle Dateien sehe, die ich hochgeladen habe, ich kann Dateien wieder rauswerfen. Ich sehe es schön, strukturiert, das hätten Überblick, was jetzt alles hochgeladen ist und kann dann mit diesen Dateien über die Apps hinweg arbeiten. Daran wählen welche von diesen Dateien ich haben möchte in der App, die ich jetzt gerade benutze, oder kann auch neue Dateien weiterhin hochladen. Zum Beispiel bin ich jetzt bei dem Video zu GIF. Ich lade ein Video hoch, das ist dann auch meine Mappe drin. Ich kann damit aber dann in dem App arbeiten und wenn ich danach nicht mehr brauche, kann ich auch aus dem Mappe wieder rausnehmen und mit den anderen Dokumenten weiterarbeiten."

## Übersetzt in Anforderungen

1. **Globale Mappe** = persistenter File-Speicher im Browser, sichtbar in Header (Icon + Counter)
2. **Hub-Seite** zeigt Mappe-Inhalt prominent oben oder als sticky-Panel
3. **Jedes Tool**:
   - Beim Upload → Datei landet zusätzlich in Mappe
   - Drop-Zone hat Alternative „Aus Mappe wählen" → Picker-Modal mit Mappe-Files
   - Verarbeitung läuft mit der gewählten Datei
4. **Mappe-Modal** (öffenbar von Header oder Hub):
   - Liste aller gespeicherten Dateien (Name, Größe, Typ-Icon, Datum)
   - Pro Datei: Vorschau (image/pdf-thumbnail), Download, Löschen
   - Bulk-Aktionen: Mehrere wählen → in Tool-X öffnen / löschen
5. **Persistenz**:
   - Über Browser-Tabs hinweg
   - Über Sessions hinweg (User schließt Browser, kommt morgen wieder, Mappe noch da)
   - Limit: 500 MB total (IndexedDB-Quota typisch ≥ 1 GB, 500 MB als safe-default)
6. **Datenschutz**:
   - 100% lokal (IndexedDB im Browser)
   - User kann jederzeit alles löschen
   - Privacy-Footer-Text aktualisieren

---

## Tech-Stack

### IndexedDB-Schema
```js
// Database: 'clawtools-mappe'
// Stores:
//   - files: { id (auto), name, type, size, blob, addedAt, lastUsed, sourceTool }
//   - meta: { key, value }  // für Quota-Tracking
```

### Wrapper-Library: `idb` (Jake Archibald)
- Klein (~3 KB), Promise-basiert, gut dokumentiert
- CDN: `https://cdn.jsdelivr.net/npm/idb@8/+esm`
- ODER selbst-hosten unter `/shared/idb.js` (wegen CDN-Drift-Risiko)

### Komponenten

#### `/shared/mappe.js` (neu)
Die zentrale Module:
```js
export async function addFile(file, sourceTool) → fileId
export async function listFiles({ types, limit, offset, sort }) → File[]
export async function getFile(fileId) → File
export async function deleteFile(fileId) → boolean
export async function clearAll() → void
export async function getQuota() → { used, total, percent }
export function onChange(callback) → unsubscribe  // BroadcastChannel
```

#### `/shared/mappe-ui.js` (neu)
UI-Komponenten:
```js
export function injectHeaderIcon(headerEl) → mountedEl
export function openMappeModal({ filterTypes, onSelect }) → Promise<File | null>
export function injectDropzoneAlternative(dropzoneEl, accept, onPick)
```

#### `/shared/shell.js` (modifizieren)
- Beim `Shell.init()`: ruft `mappe-ui.injectHeaderIcon()` auf
- Listener auf BroadcastChannel: bei Änderung → Counter aktualisieren

#### Pro Tool (modifizieren — 19 Tools)
- Drop-Zone bekommt einen sekundären Button „Aus Mappe wählen"
- Beim erfolgreichen File-Upload via Drag/Click: zusätzlich in Mappe speichern (mit User-Hinweis „in Mappe gesichert")
- Tool-spezifische `accept`-Filter werden auch beim Mappe-Picker angewendet

### CSS-Tokens (in shell.css)
- Header-Mappe-Icon mit Counter-Badge
- Modal: bottom-sheet auf Mobile, centered Dialog auf Desktop
- File-Card mit Thumbnail, Name, Meta, Aktionen

---

## Detailliertes Spec

### 1. Mappe-Modal Layout

Mobile (≤768px):
- Bottom-Sheet, slidet von unten ein
- Header: „Deine Mappe" + Quota-Bar + Schließen-X
- Filter-Pills oben: „Alle" / „PDFs" / „Bilder" / „Videos" / „Tabellen"
- File-Liste: vertikal, 1 Spalte, je Card 80px hoch
- Footer: „Alles löschen" (mit Bestätigung) + „X Dateien · Y MB"

Desktop:
- Centered Dialog, max-width 720px, max-height 80vh
- Wie Mobile aber 2-3 Spalten Grid
- Drag-Reorder optional (später)

### 2. File-Card Komponente

```html
<div class="mappe-file-card">
  <div class="thumb"><!-- image/pdf-icon/video-icon --></div>
  <div class="info">
    <div class="name">Option-A-Kniestock.pdf</div>
    <div class="meta">2,4 MB · vor 5 Min · aus PDF-Splitter</div>
  </div>
  <div class="actions">
    <button title="In aktuelles Tool laden">Wählen</button>
    <button title="Herunterladen">↓</button>
    <button title="Löschen" aria-label="Löschen">×</button>
  </div>
</div>
```

### 3. Header-Icon

In `shell.js > injectHeader`:
- Neben Tour-Button: Mappe-Icon (Folder/Stack)
- Counter-Badge bei Files > 0
- Click → `mappe-ui.openMappeModal()` ohne onSelect = nur Browse

### 4. Hub-Seite (`/index.html`)

Wenn Mappe NICHT leer:
- Sticky-Panel oben unter Hero: „Deine Mappe (3 Dateien · 12 MB)" mit Aufklapp-Pfeil
- Aufgeklappt: File-Cards horizontal scrollbar
- Pro Card: Click öffnet Modal mit „In Tool laden" Optionen je nach Datei-Typ

### 5. Per-Tool-Drop-Zone-Erweiterung

Aktuell:
```html
<div class="dropzone">
  <svg>...</svg>
  <div class="drop-title">PDF hier ablegen</div>
  <div class="drop-hint">oder Klicken</div>
</div>
```

Neu:
```html
<div class="dropzone">
  <svg>...</svg>
  <div class="drop-title">PDF hier ablegen</div>
  <div class="drop-hint">oder Klicken</div>
  <div class="dropzone-alt">
    <span>oder</span>
    <button class="btn btn-secondary btn-sm" data-action="from-mappe">
      Aus Mappe wählen (3 verfügbar)
    </button>
  </div>
</div>
```

Counter wird via `mappe.listFiles({ types: TOOL_ACCEPTS }).length` ermittelt — nur passende Files zählen.

### 6. File-Picker-Modal (mit onSelect)

Wenn User „Aus Mappe wählen" klickt:
- Modal öffnet mit gefilterten Files (Tool-spezifisch)
- User klickt File → `onSelect(blob)` wird aufgerufen
- Tool nimmt blob als wäre es ein normales Upload

### 7. Auto-Save bei Upload

Im Tool-spezifischen Code (z.B. `loadFile(file)`):
- BEVOR Verarbeitung: `await Mappe.addFile(file, 'pdf-merger')` 
- Bei Erfolg: Toast „In Mappe gesichert" mit Undo-Button
- Bei Quota-Voll: Hinweis „Mappe voll — nicht gesichert (Tool funktioniert trotzdem)"

### 8. Quota-Management

- IndexedDB.quota() abfragen (per `navigator.storage.estimate()`)
- Soft-Limit 500 MB (warnen)
- Hard-Limit Browser-default (~1-2 GB)
- LRU: bei Soft-Limit-Überschreitung älteste „lastUsed" Dateien zur Löschung vorschlagen

### 9. Sync zwischen Tabs

`BroadcastChannel('clawtools-mappe')`:
- Beim Add/Delete: emit Event
- Andere Tabs subscriben → UI updaten (Counter, Liste)

### 10. Privacy-Update

In Privacy-Footer (shell.js injectPrivacy):
- Neue Bullet: „Datei-Mappe nur in deinem Browser (IndexedDB), keine Server-Speicherung"
- Plus Link zu „Mappe komplett löschen"

---

## Welche Tools brauchen die Erweiterung

ALLE 19 Tools die einen file-upload haben (= alle außer hub und qr-code):
- pdf-splitter (eigene shell.js-Integration nötig zuerst)
- pdf-merger
- pdf-redact
- pdf-to-word
- pdf-compress
- pdf-watermark
- pdf-sign
- pdf-ocr
- images-compress
- images-to-pdf
- heic-zu-jpg
- exif-strip
- exif-rename
- docx-zu-pdf
- video-compress
- video-zu-gif
- bg-remove
- csv-edit

QR-Code hat keinen Upload — kein Mappe-Bezug nötig.

---

## Implementations-Plan (autonome Session)

### Phase 1 — Foundation (1.5h)
1. `/shared/idb.js` — selbst-hosten von Jake Archibald's idb-Library
2. `/shared/mappe.js` — IndexedDB-Wrapper schreiben
3. `/shared/mappe-ui.js` — Modal + Header-Icon Komponenten
4. `/shared/mappe.css` (oder in shell.css) — Styles für Modal, File-Cards, Header-Icon
5. Headless-Test: addFile → listFiles → getFile → deleteFile cycle

### Phase 2 — Header-Integration (0.5h)
6. shell.js: `injectHeaderIcon` aufrufen in `init()`
7. Header-Layout für Icon + Badge mit Counter
8. BroadcastChannel-Setup

### Phase 3 — Hub-Integration (0.5h)
9. index.html: Sticky-Mappe-Panel über Hero bei nicht-leerer Mappe
10. Hub-spezifische Card-Anzeige

### Phase 4 — Tool-Integration (3h)
Pattern-Refactor: für jedes der 18 Tools:
11. Drop-Zone bekommt `.dropzone-alt` Block (in shell.js zentralisiert wenn möglich)
12. `loadFile()` ruft auch `Mappe.addFile()`
13. „Aus Mappe wählen"-Button öffnet Modal mit Tool-spezifischen Filter

### Phase 5 — Privacy + QA (1h)
14. Privacy-Footer aktualisieren
15. Quota-Tracking sichtbar machen
16. Headless-Tests pro Tool: Upload → Mappe → Wiederverwendung
17. Manual-Test-Checkliste schreiben

### Phase 6 — Polish (0.5h)
18. Mobile-Optimierungen (Bottom-Sheet, Touch-Targets)
19. Animations (Slide-in, Toast bei add)
20. Empty-State („Noch keine Dateien — lade was hoch")

---

## Test-Strategie

### Headless mit Playwright
```js
// scripts/test-mappe.mjs
// 1. Hub öffnen, Mappe leer
// 2. Tool öffnen, File hochladen
// 3. Hub zurück, Mappe hat 1 File
// 4. Anderes Tool öffnen, „Aus Mappe wählen" → File-Picker
// 5. File wählen → wird verarbeitet
// 6. Mappe-Modal öffnen, File löschen
// 7. Hub-Mappe leer
```

### Cross-Tab-Test (manuell)
- 2 Browser-Tabs öffnen, Tool A und Tool B
- In A: File hochladen
- In B: Sollte Counter-Badge updaten ohne Reload

### Quota-Test
- Mehrere große Files hochladen (4×100MB)
- Quota-Warnung sollte bei ~80% erscheinen
- LRU sollte ältesten Files zum Löschen vorschlagen

---

## Constraints + Gotchas

- **IndexedDB ist asynchron** — alle Operationen Promise-basiert
- **Service Worker Cache:** Mappe-Files sollten NICHT vom SW gecacht werden (sind Blob-URLs, ändern sich nicht), nur die Mappe-UI-CSS/JS
- **Mobile Safari Quota:** kann strikter sein (~50 MB für IndexedDB ohne user-permission). Quota-Check IMMER vor add
- **Blob-URL-Lifecycle:** beim listFiles → Blob → URL.createObjectURL — alte URLs revoken!
- **PWA-Update:** wenn neuer SW deployed wird, Mappe MUSS überleben (die Cache-Clears nur SW-Caches, IndexedDB ist getrennt)
- **Privacy:** kein Tracking-Hash über Files. Auch nicht intern. Reine UUID pro File.

---

## Files die geändert werden müssen

### Neu
- `/shared/idb.js`
- `/shared/mappe.js`
- `/shared/mappe-ui.js`

### Modifiziert
- `/shared/shell.js` (Header-Icon, BroadcastChannel)
- `/shared/shell.css` (Styles)
- `/index.html` (Hub-Mappe-Panel)
- 18 × Tool-Dateien (`drop-zone-alt` + auto-save)

---

## Definition of Done

- [ ] Foundation: addFile/listFiles/getFile/deleteFile/clearAll funktionieren headless
- [ ] Header zeigt Icon mit Counter über alle 19 Tools
- [ ] Mappe-Modal öffnet von Header + Hub
- [ ] Auto-Save: Upload in Tool X → erscheint in Mappe (Toast)
- [ ] Cross-Tool: File aus Tool X uploaden, in Tool Y „Aus Mappe wählen" → wählbar
- [ ] Persistenz: Tab schließen + neu öffnen → Mappe noch da
- [ ] Cross-Tab: Live-Counter-Update via BroadcastChannel
- [ ] Privacy: Footer-Text + „Alles löschen" Button
- [ ] Mobile: Bottom-Sheet, kein Overflow, Touch-friendly
- [ ] Headless-Tests grün (verify-mappe.mjs)
- [ ] EIN Commit, EIN Push (= 1 Vercel-Build)
- [ ] Knowledge in `core/knowledge/agentic-coding-mastery/16-static-tools-failure-classes.md` Cluster #15 (Cross-Tool-State-Management)

---

## Out-of-Scope (später)

- Drag-Reorder in Mappe
- Tags / Ordner
- Export Mappe als ZIP
- Sync zwischen Geräten
- Sharing per Link

Das alles in separaten Sprints.
