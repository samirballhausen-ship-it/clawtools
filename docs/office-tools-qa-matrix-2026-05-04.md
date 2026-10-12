# CLAWBUIS Tools - QA Matrix

Datum: 2026-05-04  
Ziel: Jeder Umbaupunkt bekommt pruefbare Gates. Keine ungetesteten P0/P1-Funktionen.

## Release-Regel

Ein Release darf erst raus, wenn alle zutreffenden Gates gruen sind:

1. Automatisierte Mappe-/Workflow-Tests gruen.
2. Kein Console-Error im getesteten Flow.
3. Kein Horizontal-Overflow auf 390px Mobile.
4. P0/P1-Feedbackpunkte haben Regressionstests.
5. Mindestens ein echter Mobile-Check fuer Touch-/Kamera-/WASM-Flows.
6. Keine irrefuehrenden KI-Versprechen in UI-Texten.

## Bestehende Tests

| Test | Status | Zweck |
|---|---|---|
| `python scripts/test-mappe.py` | 75/75 gruen | Mappe API, Hub Concierge, Cross-Tool, `pdf-sign` E2E. |
| `python scripts/test-mappe-v2.py` | 26/26 gruen | Mappe-v2 User-Story und Persistenz. |
| Playwright Desktop 1440px | gruen | Hub mit Mappe + Intent "unterschreiben". |
| Playwright Mobile 390px | gruen | Hub Mobile ohne Overflow, Concierge Top-Tool. |

## Test-Fixtures

| Fixture | Zweck |
|---|---|
| `sample-contract.pdf` | Signieren, Schwaerzen, Wasserzeichen, Komprimieren. |
| `sample-scan.pdf` | OCR und Suchbarkeit. |
| `sample-multi-page.pdf` | Splitter/Organizer, Seiten drehen/loeschen. |
| `sample-invoice.pdf` | Rechnungs-Umbenennung, Beleg-Flow. |
| `sample-docx-4-pages.docx` | DOCX zu PDF Page-Count Regression. |
| `sample-table.xlsx` | Excel-Import. |
| `sample-table.csv` | CSV-Basis. |
| `sample-iphone-heic.heic` | HEIC zu JPG. |
| `sample-iphone-jpg.jpg` | JPG-Hinweis im HEIC-Tool. |
| `sample-gps-exif.jpg` | Metadaten-Check vor/nach. |
| `sample-video.mp4` | Video-Komprimierung/GIF. |

Die Fixtures sollen unter `scripts/fixtures/` liegen. Erzeugbare PDFs duerfen im Test dynamisch gebaut werden; echte EXIF/HEIC/Video-Fixtures muessen versioniert oder sauber dokumentiert werden.

## Hub / Concierge Matrix

| ID | Flow | Automatisiert | Manuell | Gate |
|---|---|---|---|---|
| HUB-001 | Leere Mappe: Dropzone + Problemfrage sichtbar | Playwright | Sichtcheck Desktop/Mobile | Muss gruen. |
| HUB-002 | Zwei PDFs in Mappe: Tool-Counter korrekt | Playwright | Sichtcheck | Muss gruen. |
| HUB-003 | Intent "unterschreiben" rankt `pdf-sign` | Playwright | Sichtcheck | Muss gruen. |
| HUB-004 | Intent "zusammenfuegen" rankt `pdf-merger` | Playwright | - | Muss gruen. |
| HUB-005 | Intent "kleiner fuer E-Mail" rankt Compress mit Preset | Neu | - | Vor Sprint 4. |
| HUB-006 | Multi-Intent erzeugt editierbaren Plan | Neu | Sichtcheck | Vor Workflow-Builder Release. |
| HUB-007 | Plan-Step loeschen aendert nur Plan, nicht Mappe | Neu | - | Muss gruen. |
| HUB-008 | Unklare Eingabe stellt kurze Rueckfrage | Neu | - | Muss gruen. |
| HUB-009 | Kein KI-Call bei klaren Standard-Intents | Playwright/Evaluate | - | Muss gruen. |
| HUB-010 | 390px kein Horizontal-Overflow | Playwright | iPhone | Muss gruen. |

## Mappe v2 Matrix

| ID | Flow | Automatisiert | Manuell | Gate |
|---|---|---|---|---|
| MAP-001 | Datei speichern und reload ueberlebt | Bestehend | - | Muss gruen. |
| MAP-002 | Tool-Use entfernt Original nicht | Bestehend | - | Muss gruen. |
| MAP-003 | Ergebnis wird als neue Version gespeichert | Neu | Sichtcheck | Sprint 3. |
| MAP-004 | Originale und Ergebnisse getrennt sichtbar | Neu | Sichtcheck | Sprint 3. |
| MAP-005 | Versionen bleiben einzeln oeffenbar | Neu | Sichtcheck | Sprint 3. |
| MAP-006 | Verlauf zeigt Quelle -> Tool -> Ergebnis | Neu | Sichtcheck | Sprint 3. |
| MAP-007 | Mappe exportiert ZIP + Manifest | Neu | Download-Test | Sprint 5/6. |
| MAP-008 | Mappe importiert ZIP + Manifest | Neu | Upload-Test | Sprint 5/6. |
| MAP-009 | Cross-Tab Sync | Bestehend | - | Muss gruen. |
| MAP-010 | Service-Worker-Update loescht keine Mappe | Bestehend/Neu | - | Muss gruen. |

## Tool Matrix

### PDF

| ID | Tool | Flow | Test |
|---|---|---|---|
| PDF-001 | `pdf-sign` | Mappe -> Tool -> Editor sichtbar | Bestehend. |
| PDF-002 | `pdf-sign` | Mobile: Signaturfeld ueberlappt nicht, Touch zeichnet | Neu + iPhone. |
| PDF-003 | `pdf-sign` | Ergebnis speichert in Mappe, Next-Steps erscheinen | Neu. |
| PDF-004 | `pdf-redact` | Touch-Rechteck auf Mobile funktioniert | Neu + iPhone. |
| PDF-005 | `pdf-redact` | Standarddaten-Vorschlaege nur nach User-Bestaetigung brennen ein | Neu. |
| PDF-006 | `pdf-compress` | Preset "E-Mail" erzeugt kleinere Datei | Neu. |
| PDF-007 | `pdf-compress` | Preset-UI ohne technische Kategorien | Manual UX. |
| PDF-008 | `pdf-watermark` | Text, Farbe, Position aktualisieren Preview live | Neu. |
| PDF-009 | `pdf-watermark` | Native Color-Picker funktioniert Mobile | Manual. |
| PDF-010 | `pdf-merger` | Position-Zahl editierbar, Reihenfolge korrekt | Neu. |
| PDF-011 | `pdf-merger` | Deckblatt-Option erzeugt erste Seite | Neu. |
| PDF-012 | `pdf-organizer` | Seiten drehen, loeschen, sortieren | Neu. |
| PDF-013 | `pdf-ocr` | Erkannte Test-Woerter sichtbar | Neu. |
| PDF-014 | `pdf-to-word` | Vorschau wirkt wie Dokument, nicht Rohtext | Manual + screenshot. |
| PDF-015 | `docx-zu-pdf` | 4-Seiten-DOCX erzeugt keine 36 Seiten | Neu P0. |

### Bilder / Dateien

| ID | Tool | Flow | Test |
|---|---|---|---|
| IMG-001 | `heic-zu-jpg` | HEIC wird akzeptiert und konvertiert | Neu. |
| IMG-002 | `heic-zu-jpg` | JPG vom iPhone zeigt "schon JPG" statt Fehler | Neu. |
| IMG-003 | `bg-remove` | WASM/ONNX laedt und Ergebnis erscheint | Neu + iPhone Safari. |
| IMG-004 | `bg-remove` | Keine "KI erkennt automatisch"-Claims | rg-Audit. |
| IMG-005 | `images-compress` | Bild wird kleiner, Preview bleibt stabil | Neu. |
| IMG-006 | `dateien-umbenennen` | Beliebige Datei-Typen akzeptiert | Neu. |
| IMG-007 | `dateien-umbenennen` | Nummerieren, Datum, Custom-Muster | Neu. |
| IMG-008 | `exif-strip` | GPS-EXIF vorher da, nachher weg | Neu mit Fixture. |
| IMG-009 | `color-picker` | Einzelne Farbe + Palette extrahiert | Neu. |

### Daten / Office / Video

| ID | Tool | Flow | Test |
|---|---|---|---|
| DATA-001 | `csv-edit` | CSV importiert | Bestehend/Neu. |
| DATA-002 | `csv-edit` | XLSX importiert via SheetJS | Neu P0. |
| DATA-003 | `csv-edit` | Zwei Listen gegeneinander abgleichen | Neu. |
| DATA-004 | `text-anonymisieren` | E-Mail/Telefon/IBAN maskieren | Neu. |
| DATA-005 | `text-diff` | Zwei Texte zeigen Unterschiede | Neu. |
| VID-001 | `video-compress` | ffmpeg verfuegbar, Worker laedt | Neu P0. |
| VID-002 | `video-compress` | Output kleiner und downloadbar | Neu. |
| VID-003 | `video-zu-gif` | Worker nicht cross-origin geblockt | Neu P0. |
| QR-001 | `qr-code` | Mobile Preview bleibt quadratisch/stabil | Neu. |
| QR-002 | `qr-code` | QR auf PDF als Open-Idee testbar | Spaeter. |

## Text-/Promise-Audit

Automatisiert per `rg` vor Release:

```powershell
rg -n -e "automatisch erkannt per KI" -e "KI-Modell laeuft" -e "KI-Funktionen" -e "KI-Editor" -e "starke KI" . -g "*.html" -g "*.js"
```

Gate:

- Keine irrefuehrenden KI-Claims.
- Wenn Modell/WASM im Browser laedt, klare ehrliche Sprache: "Verarbeitung laeuft im Browser", "Ergebnis pruefen".

## Console-/Network-Gates

Jeder Playwright-Flow sammelt:

- `pageerror`
- `console.error`
- relevante `console.warning` bei Worker/WASM/PDF-Parsing
- failed requests fuer `.wasm`, `.worker.js`, `.mjs`, `.pdf`, `.docx`

Gate:

- P0-Flows: null errors, null failed critical requests.
- P1-Flows: warnings nur dokumentiert erlaubt.

## Mobile-Gates

Viewport-Automation:

- 390 x 844.
- 430 x 932.
- 768 x 1024.
- Desktop 1440 x 1000.

Echte Geraete:

- iPhone Safari.
- iPhone Chrome wenn PWA relevant.
- Android Chrome optional.

Mobile-Mindesttests:

- Kein Horizontal-Overflow.
- Buttons mindestens 44px Touch-Ziel.
- Drag/Draw mit Pointer Events.
- Fixed/Floating UI ueberlappt keine Kernflaeche.
- Kamera/File-Picker erklaert HEIC/JPG sauber.

## 40-Final-Feedback-Gate

Sobald die naechsten finalen Feedbacks kommen:

1. Jeden Punkt in `docs/feedback/FINAL-FEEDBACK-40-2026-05-04.md` erfassen.
2. P0/P1 sofort einer Test-ID zuordnen.
3. Vor Implementierung pruefen: Gibt es schon einen Test? Wenn nein, Test zuerst planen.
4. Nach Implementierung: Status `verified` erst nach automatisiertem oder echtem Geraete-Test.

Definition `done`:

- `implemented` reicht nicht.
- `verified` heisst: Test gruen + Screenshot/Log/Fixture falls relevant.

