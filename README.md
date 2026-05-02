# CLAWBUIS Tools — `tools.clawbuis.com`

19 kostenlose Web-Werkzeuge für Dokumente, Bilder, Video und Daten.
**Alles im Browser. Keine Uploads. 100 % DSGVO.**

> "Ihr werft was rein, wir sagen was geht."

## Stand

| Tool | Status |
|------|--------|
| PDF Splitter | ✅ Live |
| Smart-Suggest (Hub) | ✅ Live |
| Tutorial-System | ✅ Live |
| 18 weitere Werkzeuge | 🚧 Phase 1-5 (siehe Roadmap unten) |

## Architektur

**Static Multi-File** — kein Build-Step. Jedes Tool ist eine eigenständige `index.html`,
shared Frame über `shared/{tokens.css, shell.css, shell.js, suggest-engine.js}`.

```
clawtools/
├── index.html              # Hub
├── shared/                 # Tokens · Shell · Tour · Suggest-Engine
├── pdf-splitter/           # ✅ Live
├── pdf-merger/             # 🚧 Phase 1
├── ... (17 weitere Tool-Folders)
├── impressum/
├── datenschutz/
├── agb/
└── vercel.json
```

## Warum Static Multi-File und nicht Vite/Next.js

| Kriterium | Static Multi-File | Vite/Next |
|-----------|-------------------|-----------|
| DSGVO-Audit-Tauglich | ✅ Anwalt liest 1 File | ❌ Bundle reverse-engineering |
| Tool-Isolation | ✅ Crash A bricht B nicht | ❌ Build-Error = alles down |
| Deploy-Speed | ✅ Push = 8s live | ⚠️ 60-90s Build |
| Lib-Cache-Sharing | ✅ CDN-Cache global | ❌ Bundle pro Route |

## Tech-Stack (alles im Browser)

| Funktion | Library |
|----------|---------|
| PDF | `pdf-lib` + `pdf.js` |
| OCR | `Tesseract.js` |
| HEIC | `libheif-js` (WebAssembly) |
| Video | `ffmpeg.wasm` |
| Bilder | Canvas API + `exifr` |
| Hintergrund-Entfernen | `@imgly/background-removal` (WebGPU) |
| ZIP | `JSZip` |
| Excel | `SheetJS` |
| QR | `qrcode.js` |

Alle Bibliotheken werden via `cdn.jsdelivr.net` / `cdnjs.cloudflare.com` geladen.
Kein npm-Build, kein Bundler.

## DSGVO-Position

- **Verarbeitung:** 100 % im Browser via WebAssembly + Browser-APIs
- **Hosting:** Vercel `fra1` (Frankfurt, EU)
- **Tracking:** keine Cookies, keine Analytics, keine Pixel
- **Storage:** `localStorage` nur für `clawtour_dismissed` Boolean
- **CSP:** strict, kein eval, kein inline-script ohne explicit-allow
- **Audit:** dieses Repo public — Code beweist die Aussagen

## Lokal testen

```bash
# Im Projekt-Verzeichnis:
python3 -m http.server 8080
# oder:
npx serve .
# Dann: http://localhost:8080
```

Kein Build nötig.

## Deploy auf Vercel

1. Repo auf GitHub pushen (initial private)
2. Vercel: "New Project" → Repo verlinken → Framework: "Other" → Root: `.`
3. Custom Domain: `tools.clawbuis.com` → Vercel zeigt CNAME-Anweisung
4. Bei DNS-Provider für `clawbuis.com`:
   ```
   Type:  CNAME
   Name:  tools
   Value: cname.vercel-dns.com
   ```
5. Vercel zeichnet auto-renewende Let's-Encrypt-SSL aus
6. Optional: `pdf-splitter-mauve.vercel.app` → `tools.clawbuis.com/pdf-splitter` (siehe `vercel.json:redirects`)

## Roadmap

- [x] **Phase 0 — Foundation:** Repo · shared/ · Hub · Splitter-Migration · Legal · Vercel
- [ ] **Phase 1 — Top-3 Killer:** PDF-Merger · HEIC→JPG · EXIF-Strip
- [ ] **Phase 2 — Bild-Heavy:** Komprimieren-Batch · EXIF-Rename · Bilder→PDF
- [ ] **Phase 3 — PDF Power:** PDF-Komprimieren · OCR · Schwärzen · Wasserzeichen
- [ ] **Phase 4 — Konvertierung:** PDF→Word/Excel · DOCX→PDF · CSV-Editor · BG-Remove
- [ ] **Phase 5 — Video & Spezial:** Video-Compress · Video→GIF · PDF-Sign · QR
- [ ] **Phase 6 — Erklärvideo:** 90s Cinematic-Video Launch

Spec: [`docs/superpowers/specs/2026-05-02-clawbuis-tools-design.md`](../../docs/superpowers/specs/2026-05-02-clawbuis-tools-design.md)
Video-Brief: [`docs/marketing/explainer-video-brief-90s.md`](../../docs/marketing/explainer-video-brief-90s.md)

## Bekannte TODOs vor Public-Launch

- [ ] **Impressum** — Adresse einsetzen (`impressum/index.html` Zeile mit `[STRASSE...]`)
- [ ] **DNS** — CNAME `tools.clawbuis.com` → `cname.vercel-dns.com`
- [ ] **Repo public** — nach Phase 2 für DSGVO-Audit-Trail

## Lizenz

TBD — wahrscheinlich MIT für Code, CC-BY-NC-SA für Dokumentation.
