# Copy-Paste-Prompt für die Datei-Mappe Session

> Pasten in eine NEUE Claude Code Session. Working-Dir muss `C:\Apps\CLAWBUIS\projects\tools` sein (oder Claude wechselt selbst hin).

---

## Der Prompt:

```
Hi, du startest hier full-autonom an einem klar abgegrenzten Feature.

Working-Dir: C:\Apps\CLAWBUIS\projects\tools (git-Repo, push deployt zu tools.clawbuis.com via Vercel)

PFLICHT-LESE als allererstes:
docs/feedback/SESSION-BRIEFING-datei-mappe.md

Dort ist alles spezifiziert: Anforderung 1:1 von Samir, Tech-Stack, IndexedDB-Schema, alle 6 Phasen mit Zeitschätzung, Definition of Done.

Arbeite die 6 Phasen autonom durch. Keine Rückfragen außer wenn DOD nicht erfüllbar ist.

Regeln:
- Alle Änderungen LOKAL sammeln, EIN finaler Commit + EIN Push am Ende = 1 Vercel-Build (Build-Kosten klein halten)
- Headless-Tests mit Playwright nach jeder Phase
- Mobile-First denken (iPhone 13 Viewport 390x844 ist die Referenz)
- Keine überzogenen Marketing-Versprechen ("automatisch erkannt per KI" ist verboten — siehe Cluster #8 in core/knowledge/agentic-coding-mastery/16-static-tools-failure-classes.md)
- Sprache: Endbenutzer-friendly, KEINE Library-Namen oder Format-Codes im UI sichtbar
- Privacy: 100% lokal, IndexedDB, kein Tracking
- Service Worker beachten: bei deploy soll IndexedDB-Daten überleben (nur SW-Cache wird invalidated)

Test-Files lokal verfügbar:
- C:/Apps/2026/Aufstocken/PDF_Bericht/Option-A-Kniestock.pdf (18 Seiten, 50 KB)
- C:/Apps/2026/Aufstocken/PDF_Bericht/Option-B-Dachanhebung.pdf
- C:/Apps/CLAWBUIS/deliveries/lumera-instagram-profile-2026-05-01/01_holographic_crown.jpg
- C:/Apps/CLAWBUIS/output/videos/2026-04-22-clawbuis-cinematic-compressed.mp4 (10 MB)
- C:/Apps/clawbuis-demo-store/scripts/test-4page.docx (4 Seiten, 8 KB)

Workflow:
1. Briefing-Doc komplett lesen
2. TodoWrite mit den 6 Phasen aufsetzen
3. Phase für Phase: build → test (headless mit Playwright) → mark done
4. Nach Phase 4 (Tool-Integration): all 18 Tools verifizieren mit verify-mappe.mjs
5. Final: Commit + Push, dann Knowledge-Doc updaten

Wenn ein Tool was nicht akzeptiert (z.B. csv-edit hat eigene xlsx-Logic) → Tool-spezifischen accept-Filter im Mappe-Picker übernehmen.

Service-Worker-Detail: bei deploy bumpe Cache-Version (CACHE_VERSION in sw.js) damit Browser-Refresh den neuen Code lädt.

Bei Frage: lieber Defaults wählen + dokumentieren statt User fragen.

Los.
```

---

## Was ich (vorherige Session) heute schon gefixt habe + wo es steht

Damit die neue Session keine schon-fertigen Bugs erneut anschaut:

✅ **video-zu-gif/video-compress ffmpeg lädt nicht mehr** (self-hosted in `/shared/ffmpeg/`)
✅ **bg-remove ONNX-WASM funktioniert** (CSP `blob:` für script-src + ONNX-Pre-Config)
✅ **pdf-to-word Bold/Italic-Detection** verbessert mit font-suffix-Pattern
✅ **csv-edit Mobile-Tabellen-Overflow** gefixt (sticky erste Spalte + scroll-hint)
✅ **Tour-Tooltip Mobile** als Bottom-Sheet (war: nur Backdrop sichtbar)
✅ **PWA installierbar** (manifest, sw, icons)
✅ **Datenschutz-Footer collapsible** (`<details>` statt 5-Bullet-Block)
✅ **Service Worker network-first** (User sieht immer aktuellen Code)

🔵 **Offen** (kann auch in der neuen Session mit erledigt werden wenn Zeit):
- pdf-splitter hat KEINE shell.js-Integration — kein Tour, keine PWA-Meta, kein Privacy-Footer. Eigenes Layout. (Refactor 1-2h)

Aktueller HEAD: `ab12d2f` (siehe `git log` für Details).

Repo: `samirballhausen-ship-it/clawtools` (private, GitHub).

---

## Nach der Session

Sobald die neue Session done meldet:

1. Mir hier sagen → ich verifiziere headless gegen `https://tools.clawbuis.com` 
2. Ich teste alle 18 Tools mit echten Files: Upload → Mappe → Wiederverwendung
3. Ich prüfe Cross-Tab via 2-Context-Test
4. Falls Bugs → ich fixe direkt + dokumentiere
5. Falls perfekt → wir bauen das nächste Feature
