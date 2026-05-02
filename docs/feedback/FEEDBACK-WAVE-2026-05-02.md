# Feedback Wave — 2026-05-02 (Samir Mobile-Test, iPhone)

> **Quelle:** Samir, Live-Test auf Handy nach PWA-Push.
> **Status:** AUFGENOMMEN, noch nicht abgearbeitet.
> **Bedingung:** keine einzelnen Pushes — alles lokal sammeln, EIN Push am Ende = 1 Vercel-Build.

---

## Original-Wortlaut Samir (1:1)

> Der daten Schutz bereich unten ist zu üräsemt mach ihn zum ausklappen und beim pdf zusammenfügen soll ich auch auch bei jedem erkannten pdf drauf drücken können bei der Zahl und die Nummer an die es kommen soll eingeben könnene bei pdf komptimieren Qualitäts presets und dke Kategorien das veftshwt niemand. Außerdem müssen wir generell diese stellen wo man das Dokument oder die dlujentbe soeht fie hochgeladen sind müssen wir optisch deutlich aufwerten das siegt sehr gebratoh aus und geht irgendwie unter in der seite.
>
> pdf durchsuch Bar macje da bitte bei test Wörter hin machen das ist eidneutkciher
>
> pdf zu word die Vorschau anpassen das muss optisch richtig qas hermachen
>
> pdf schwärzen ust noch nicht für mobile geeignet daher kann ich es nicht testen
>
> pdf Wasserzeichen die farb Auswahl optisch deutlich schöner macjen udn das gajze farb Spektrum ermöglichen. Außerdem ändert sich nur die farbe weder Text wenn ich es eingebe nocj Position
>
> das mkt dem signieren klappt noch gar nicht auch null mobile optimiert da überlagert sich das Unterschrift feld komplett zj allem andern jnd es wird nichg richtig gespeichert und so
>
> Wenn meine Freundin bon ihrem iPhone 16 Pro max bidler hoch lädt sagt es nur hic dings da Bilder erlaubt. Bitte prüfen. Sie hat eben geschaut ihre Bilder sind img also sollten wir dazu sagen, das neuere iPhone in der Regel die bilder schon richtig jaben wenn es so ist
>
> Bilder umbenennen ist viel zu technisch und hier brauchen wir mehr Möglichkeiten dass auch einfach nummeriert werden kann oder so und wiegsag sows wie exif fallback oder so das versteht keiner. und das öüssen ja nicht nur bilder sein.
>
> Bei der meta daten löschen app gleiches problem mit der Sprache und das kann ich nciht verifzieten jier muss ich mich auf dich verlassen.
>
> Bei Hintergrund entfernen steht automatisch erkannt per KI das akk natürlich nicjt sein lass das weg und schau auch das nirgendwo sonst sowas dteht das ist irreführend. unf wenn ich es versuche zu machen kriege ich kur Failed to create session: "Error: no available backend found. ERR: [wasm] TypeError: Failed to fetch dynamically imported module: blob:https://tools.clawbuis.com/d29667ec-
>
> word zu pdf Konvertierung klappt überhaupt nicht da kriege ich bei 4 seiten word 36 seiten pdf raus.
>
> Bei dem Excel Datei bearbeiten ding kann ich keien hochladen unf somit such nicjt testen bzw. jast du kur csv aber ich dachte wir können es aucv für alle Excel Tabellen machen
>
> Bei video komprimieren kriege ich due Meldung ffmpeg nicht verfügbar, da auch intensiv rein gehen. unf auch fetch file fehler
>
> Bei dem video zu gif Tool kriege ich Failed to construct 'Worker': Script at 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10 cannot be accessed from origin 'https://tools.clawbuis.com'.
>
> vorsvhau bei der qr code app mobile biggt extrem das zeiht soxj so nach unten sonst funktioniert sie einwandfrei.

---

## Strukturiert & priorisiert

### 🔴 P0 — KOMPLETT KAPUTT (Tool funktioniert nicht)

#### #1 — bg-remove: WASM-Backend lädt nicht
- **Symptom:** „Failed to create session: Error: no available backend found. ERR: [wasm] TypeError: Failed to fetch dynamically imported module: blob:https://tools.clawbuis.com/d29667ec-…"
- **Root cause (vermutet):** ONNX-Runtime versucht WASM-File via `blob:`-URL zu laden → CSP `script-src` blockt das ODER Cross-Origin-Isolation-Header fehlen für `SharedArrayBuffer`
- **Action:** ONNX-Backend statisch konfigurieren, WASM-Pfade explizit auf jsdelivr CDN setzen, vercel.json CSP/COOP/COEP-Headers prüfen
- **Test-Bedingung:** Auf iPhone Safari ein JPG hochladen, Hintergrund-Entfernung läuft durch, Result-Bild erscheint

#### #2 — video-compress: ffmpeg nicht verfügbar
- **Symptom:** „ffmpeg nicht verfügbar" + „fetch file Fehler"
- **Root cause (vermutet):** ffmpeg.wasm braucht `crossOriginIsolated` (COOP+COEP-Header). Vercel default sendet die nicht. Ohne SharedArrayBuffer kann ffmpeg.wasm nicht starten.
- **Action:** vercel.json mit `Cross-Origin-Embedder-Policy: require-corp` + `Cross-Origin-Opener-Policy: same-origin` ergänzen. Plus: ffmpeg.wasm Loader auf neuere Version + selbst-gehostet (CDN-cross-origin-Worker geht nicht ohne CORP-Header).

#### #3 — video-zu-gif: Worker cross-origin block
- **Symptom:** „Failed to construct 'Worker': Script at 'https://cdn.jsdelivr.net/…@ffmpeg/ffmpeg@0.12.10' cannot be accessed from origin 'https://tools.clawbuis.com'"
- **Root cause:** Workers können NICHT cross-origin geladen werden ohne CORS+CORP-Header. ffmpeg@0.12 lädt seinen eigenen Worker, jsdelivr serviert ihn ohne `Cross-Origin-Resource-Policy` Header → Browser blockt.
- **Action:** Selbst hosten (ffmpeg-core.js + ffmpeg-core.wasm + ffmpeg.worker.js lokal in `/shared/ffmpeg/`) ODER ffmpeg-Wrapper nutzen der inline-Workers via Blob-URL erstellt.

#### #4 — docx-zu-pdf: 4 Seiten Word → 36 Seiten PDF
- **Symptom:** völlig falsche Page-Anzahl, Layout zerstört
- **Root cause (vermutet):** html2canvas rendert die ganze Word-HTML auf einer riesigen Single-Canvas, dann wird die Canvas in PDF-Pages aufgeteilt → mit zu kleinen Schritten = Übersplit
- **Action:** Logik komplett umbauen — pro Word-Page direkt rendern, Page-Breaks aus DOCX-Page-Setup übernehmen ODER Mammoth-HTML mit pdf-lib direkt schreiben (Text + simple Layout) statt HTML-Canvas-Approach.

#### #5 — pdf-sign: Mobile total kaputt
- **Symptom:** Signatur-Feld überlagert sich mit allem, Speichern klappt nicht, „null mobile optimiert"
- **Root cause:** Layout-Issue (canvas position, modal overlay), Speicher-Logik vermutlich auch mit canvas-coordinate-Bug
- **Action:** Layout-Refactor (Canvas in eigene Layer mit `touch-action: none`, Modal als bottom-sheet auf Mobile), Speicher-Coordinate-Bug fixen, Touch-Event-Listener (nicht nur Mouse).

#### #6 — pdf-redact: Mobile noch nicht testbar
- **Status:** Ich habe in vorigem Push pdf-redact-Mobile gefixt (canvas constraint, editor-grid). Samir sagt aber „noch nicht für mobile geeignet". Möglicherweise: Touch-Drawing-Logik (Schwärzungs-Rechteck zeichnen) funktioniert nur mit Maus, nicht mit Finger.
- **Action:** Touch-Event-Listener hinzufügen (`touchstart/move/end` parallel zu `mousedown/move/up`), Touch-Coordinates → Page-Coordinates umrechnen, ggf. mobile-optimiertes UI (Tap-zoom-into-page, Drag-rect mit Finger).

#### #7 — heic-zu-jpg: iPhone 16 lädt JPG hoch, Tool sagt „nur HEIC erlaubt"
- **Symptom:** Freundin's iPhone 16 Pro Max nutzt schon JPG (heißt aber `IMG_xxxx`), Tool blockt
- **Root cause:** Newer iPhones speichern oft JPG direkt (besonders bei iCloud-Foto-Stream oder geteilten Bildern). Tool akzeptiert nur `image/heic, image/heif`.
- **Action:**
  1. Drop-Validation auf alle Bild-Formate erweitern (JPG, PNG, HEIC, HEIF)
  2. Bei JPG-Upload: Hinweis „Dieses iPhone-Foto ist schon JPG — kein Umwandeln nötig" + Option „trotzdem optimieren/komprimieren"
  3. Hub-Description: „Falls dein iPhone schon JPG speichert (neuere Modelle, iCloud-Stream), brauchst du das Tool nicht"

#### #8 — csv-edit: Keine Excel-Datei (.xlsx) hochladbar
- **Symptom:** Samir kann nichts hochladen, Tool akzeptiert nur `.csv`
- **Action:** Library `SheetJS` (xlsx) integrieren — `.xlsx` und `.xls` einlesen, parsen, als Tabelle anzeigen, als CSV/XLSX exportieren. Drop-validation erweitern.

---

### 🟠 P1 — UX-PROBLEME (Tool läuft, aber verwirrend/unschön)

#### #9 — pdf-merger: Position direkt eingeben
- **Aktuell:** Drag & Drop für Reihenfolge
- **Wunsch:** Auf die Position-Zahl klicken → Eingabefeld → neue Position eintippen
- **Action:** `<button>` mit Position-Zahl, click → input-prompt → re-order state.files Array → render

#### #10 — pdf-compress: Qualitäts-Presets + Kategorien verwirrend
- **Aktuell:** Vermutlich technische Optionen (DPI, Quality 0-100, etc.)
- **Wunsch:** klare Presets — z.B. „Klein für E-Mail" / „Mittel" / „Hohe Qualität"
- **Action:** 3-4 Quality-Presets-Buttons mit Icon + Use-Case-Beschreibung, Kategorie-Dropdown weg

#### #11 — Generelle Upload-Zonen optisch aufwerten
- **Wunsch:** Drop-Zonen sehen „sehr gebraucht aus", gehen unter
- **Action:** shell.css `.dropzone` neu designen — größerer Icon, klarerer Border, Hover-Animation, Mobile-Touch-friendly. Bei aktiven Files: Card-Style mit visueller Hierarchie.

#### #12 — pdf-ocr: Test-Wörter / Beispiel-Output
- **Wunsch:** Bei der „durchsuchbar machen"-App soll der User SEHEN was erkannt wurde — Test-Wörter, Beispiel-Output
- **Action:** Nach OCR: Top-10 erkannte Wörter als Tag-Cloud anzeigen ODER Snippet-Vorschau („…2 erkannten Wörter im Dokument: ‚Vertrag', ‚Mietvertrag', ‚Datum'…") + Demo-Modus mit Sample-Scan-PDF

#### #13 — pdf-to-word: Vorschau aufwerten
- **Wunsch:** Optisch deutlich besser, „richtig was hermachen"
- **Action:** Vorschau als A4-Page-Mockup mit Schatten, Schrift-Style aus dem PDF erhalten (font-detection ist schon eingebaut, Visual-Output zeigt Text aber ohne Format-Spuren), zusätzlich Vorher/Nachher-Compare

#### #14 — pdf-watermark: Farbe + Text + Position
- **Bug:** Nur Farbe ändert sich, Text-Eingabe + Position-Auswahl werden NICHT auf Vorschau übernommen
- **Wunsch:** Vollständiges Farb-Spektrum (Color-Picker, nicht 5 Presets)
- **Action:**
  1. Live-Preview-Bug fixen (Event-Listener auf Text-Input, Position-Select neu binden)
  2. `<input type="color">` für Color-Picker (native Browser, ganzes Spektrum)
  3. Optisch schöner: Color-Swatches + Custom-Color-Slider

#### #15 — bg-remove: „automatisch erkannt per KI" entfernen
- **Begründung:** KI ist nicht 100% perfekt, Behauptung irreführend
- **Action:**
  1. In bg-remove: Lede ohne „automatisch erkannt per KI"
  2. **Globale Audit:** alle Tool-Lede + Tutorial-Texte auf ähnliche überzogene Versprechen scannen
  3. Sprache: „funktioniert in den meisten Fällen", „erkennt typische Motive" statt absoluten Versprechen

#### #16 — exif-rename: Sprache + mehr Optionen + alle Files
- **Aktuell:** „EXIF fallback" — zu technisch
- **Wunsch:**
  1. Sprache vereinfachen
  2. Optionen: einfach nummerieren (1, 2, 3…), nach Datum, nach Dateigröße, eigenes Muster
  3. Soll für ALLE Files funktionieren, nicht nur Bilder
- **Action:** Tool umbauen zu „Dateien umbenennen" — Pattern-Picker (Datum / Nummer / Custom), Datei-Typ-agnostic

#### #17 — exif-strip: Sprache + Verifikation
- **Aktuell:** Sprache zu technisch (auch nach vorigem Fix)
- **Wunsch:** „Du musst es verifizieren, ich kann nicht"
- **Action:**
  1. Sprache nochmal vereinfachen (lese ich gerade Texte und prüfe)
  2. **Selbst-Verifikation:** mit echten JPG mit GPS-EXIF testen, vor/nach exif-data prüfen, dokumentieren

#### #18 — qr-code: Vorschau biegt mobile, zieht nach unten
- **Symptom:** Layout-Bug auf Mobile, sonst funktioniert
- **Action:** QR-Canvas-Wrap mobile-spezifisch fixen (max-height, aspect-ratio:1, no-grow)

---

### ✅ Bereits gefixt im PWA-Push (2026-05-02 nachmittag)

- ✅ Datenschutz-Bereich collapsible (Details-Element, Default zugeklappt)
- ✅ App-Installation auf Homescreen (PWA mit manifest, SW, Icons, Install-Banner)

---

## Reihenfolge der Bearbeitung (vorgeschlagen)

**Block A — Kritische Fixes (P0):**
1. vercel.json: COOP+COEP+CORP-Header für SharedArrayBuffer-fähige Tools
2. video-compress + video-zu-gif: ffmpeg.wasm self-hosting in `/shared/ffmpeg/`
3. bg-remove: ONNX-Runtime config + WASM-Pfad-Konfig
4. heic-zu-jpg: Drop-Validation erweitern + JPG-Hint
5. docx-zu-pdf: Logik-Refactor (page-break)
6. pdf-sign: Mobile-Layout + Touch-Events
7. pdf-redact: Touch-Drawing
8. csv-edit: SheetJS-Integration für .xlsx

**Block B — UX-Aufwertung:**
9. shell.css: `.dropzone` Redesign (alle Tools)
10. pdf-merger: Position-Click-to-Edit
11. pdf-compress: Quality-Presets neu
12. pdf-watermark: Color-Picker + Bug-Fix Live-Preview
13. pdf-ocr: Erkannte-Wörter-Preview
14. pdf-to-word: Vorschau aufwerten
15. exif-rename: Tool-Umbau zu „Dateien umbenennen" mit Patterns
16. qr-code: Mobile-Vorschau-Layout-Fix

**Block C — Sprache & Korrekturen:**
17. bg-remove: „KI"-Versprechen weg
18. Globaler Audit: überzogene Versprechen entfernen
19. exif-strip: Sprache nochmal feiner + Selbst-Verifikation

**Block D — Knowledge & Push:**
20. Cluster-Doku in `core/knowledge/agentic-coding-mastery/16-static-tools-failure-classes.md` erweitern
21. EIN Commit, EIN Push

---

## Notizen für Bearbeitung

- **vercel.json mit COOP+COEP-Header** ist der Schlüssel für video-compress + video-zu-gif. Das ist ein Single-File-Change der gleich 2 P0-Bugs adressiert.
- **csv-edit + xlsx**: SheetJS (`xlsx@0.18.5`) ist die Standard-Lib, sehr klein (~700 KB minified), keine WASM-Anforderung.
- **bg-remove**: Wenn COEP-Header gesetzt sind, könnte das auch das ONNX-WASM-Problem lösen. Erst Header pushen, neu testen.
- **pdf-sign Touch**: HTML5 Canvas mit `pointermove` (unified pointer events) statt mouse+touch separat.
- **docx-zu-pdf**: Alternative-Library `docx-pdf-converter` oder `pdf-lib + mammoth` direkt — html2canvas-Approach ist zu fragile.

---

## Stand-Linie

Diese Doku wird vor Start der Fixes als „Snapshot" committet. Beim Abarbeiten wird sie NICHT verändert (außer Status-Häkchen). Eine Folge-Doku `FEEDBACK-WAVE-2026-05-02-STATUS.md` dokumentiert pro Punkt was tatsächlich gemacht wurde.
