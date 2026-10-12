# CLAWBUIS Tools - Final Feedback Synthese

Datum: 2026-05-04  
Quelle:

- `C:\Users\samir\Downloads\clawbes-tools-workflow-lab-2026-05-04.json`
- `C:\Users\samir\Downloads\clawbes-tools-workflow-lab-2026-05-04 (1).json`

Hinweis: Die Exporte tragen noch `CLAWBES` im Source-Namen. Das ist Legacy aus dem alten Fehler. Produktname und UI bleiben konsequent `CLAWBUIS`.

## Kurzentscheidung

`tools.clawbuis.com` wird nicht als Tool-Katalog weitergebaut. Die App wird ein lokaler Office-Workflow-Workspace:

1. User wirft Dateien in die Mappe.
2. User sagt, was am Ende rauskommen soll.
3. CLAWBUIS erkennt lokal Datei-Typen, Datei-Zustaende und Intent.
4. Bei klarer Lage wird direkt der richtige naechste Schritt vorgeschlagen.
5. Bei Mehrdeutigkeit entsteht ein sichtbarer, editierbarer Workflow-Plan.
6. Ergebnisse landen als neue Version in der Mappe.
7. Nach jedem Ergebnis werden sinnvolle Folgeaktionen angeboten.

## Die 7 Produktgesetze

### 1. Mappe ist Workspace, nicht Dateikorb

Die Mappe ist der sichtbare Arbeitszustand. Originale, Bearbeitungen, Versionen und Verlauf muessen dort begreifbar sein.

Konsequenz:

- Originale und Ergebnisse getrennt anzeigen.
- Versionen unter einer Datei-Familie gruppieren.
- Datei-Zustaende als Badges zeigen: `original`, `signiert`, `geschwaerzt`, `komprimiert`, `ocr`, `wasserzeichen`, `umbenannt`, `konvertiert`.
- Alte Versionen bleiben erreichbar.

### 2. Problemfrage vor Toolsuche

Der Hub fragt nicht primaer "Welches Tool willst du?", sondern "Was soll am Ende rauskommen?".

Konsequenz:

- Tool-Liste bleibt als Fallback sichtbar.
- Der eigentliche Hauptmodus ist Concierge + Mappe.
- Eindeutige Intents gehen direkt in ein Tool.
- Mehrdeutige Intents werden als Plan gezeigt.

### 3. Lokal und kostenlos als Standard

Kein Upload, kein Account, keine Werbung, keine Cloud im Standardflow.

Konsequenz:

- Datei-Inhalte bleiben lokal.
- Routing zuerst regelbasiert.
- Optionaler KI-Router nur fuer Text-Intent, nie fuer Dateiinhalte im kostenlosen Standard.
- KI darf nur Kosten verursachen, wenn lokales Routing nicht reicht und die Anfrage komplex genug ist.

### 4. Workflow sichtbar, editierbar, erst dann ausfuehren

Office-NG-Transfer: `show_preview` fuer Workflows.

Konsequenz:

- Multi-Step-Aufgaben werden als Plan-Karte gerendert.
- User kann Schritte loeschen, Reihenfolge aendern oder Datei-Zuordnung korrigieren.
- Erst nach Bestaetigung wird der Workflow ausgefuehrt.

### 5. Eindeutiges sofort anwenden

Office-NG-Transfer: `update_field` wird zu `add_step`, `set_file_state`, `set_output_rule`.

Konsequenz:

- "PDF unterschreiben" + eine passende PDF: direkt `pdf-sign` vorschlagen.
- "zwei PDFs zusammenfuegen" + zwei PDFs: direkt `pdf-merger`.
- "kleiner fuer E-Mail" + PDF: `pdf-compress` mit Mail-Preset.
- Rueckfragen nur bei Konflikt, Mehrdeutigkeit oder niedriger Confidence.

### 6. Optionen in bestehende Tools, keine Kachel-Flut

Viele Build-Ideen sind keine neuen Apps, sondern Optionen oder Teilflows in bestehenden Tools.

Konsequenz:

- Anlagenpaket mit Deckblatt gehoert in `pdf-merger`.
- Schwaerz-Assistent gehoert in `pdf-redact`.
- Rechnungs-PDF umbenennen gehoert in `exif-rename` / `dateien-umbenennen`.
- Listen abgleichen gehoert in `csv-edit`.
- Text-Diff gehoert in Dokumentvergleich, nicht als isolierte Spielzeug-Kachel.

### 7. Realtest vor Release

Code-Pass ist wertlos, wenn iPhone, Mobile-Touch, Worker, WASM oder echte Datei-Uebergabe brechen.

Konsequenz:

- Jeder Build bekommt Playwright-Tests.
- Jeder P0/P1-Feedbackpunkt bekommt einen Regressionstest.
- Mobile 390px und iPhone-Realtest sind Release-Gates.
- Kein Push, solange P0/P1 offen oder ungetestet ist.

## Build-Ideen: Uebersetzung in Umsetzung

| ID | Idee | Entscheidung | Umsetzung |
|---|---|---|---|
| `pdf-flow-001` | PDF nach Signatur weiterfuehren | Core | Ergebnis wird in Mappe gespeichert, Folgeaktionen erscheinen direkt. Bereits fuer `pdf-sign` begonnen. |
| `pdf-flow-002` | Seiten sortieren, drehen, loeschen | Kern-PDF-Modul | Neuer `pdf-organizer` oder Erweiterung `pdf-splitter`: Thumbnail-Grid, Drag-Reorder, Rotate, Delete, Export. |
| `pdf-flow-003` | Anlagenpaket mit Deckblatt | Option in `pdf-merger` | "Deckblatt hinzufuegen" als Zusatzoption mit Titel, Empfaenger, Datum, Inhaltsliste. |
| `pdf-flow-005` | Unterschriften- und Datums-Check | Pruefschritt | Lokaler Check fuer Text/Annotation/Bild-Hinweise; zeigt "vermutlich unterschrieben" / "Datum fehlt" mit Unsicherheit. |
| `pdf-flow-006` | Schwaerz-Assistent fuer Standarddaten | Option in `pdf-redact` | Muster fuer E-Mail, Telefonnummer, IBAN, Adresse. Markierungen als Vorschlag, User bestaetigt. |
| `pdf-flow-008` | Rechnungs-PDF automatisch umbenennen | Option in Dateien-Umbenennen | OCR/Text falls verfuegbar, Datum/Betrag/Rechnungsnummer in Dateiname. |
| `img-002` | Beleg-Scanner aus Fotos | Qualitaetsgate | Nur bauen, wenn Kanten-/Perspektivkorrektur + PDF-Export auf Mobile sauber funktionieren. |
| `img-006` | Farb-Picker aus Foto | Quick Win | Pipette + Palette der Hauptfarben. Guter Free-Tool-/SEO-Hebel. |
| `office-001` | Text anonymisieren | Datenschutz-Tool | Text rein, sensible Muster markieren, anonymisierte Ausgabe kopieren/exportieren. |
| `data-003` | Listen gegeneinander abgleichen | In `csv-edit` | Zwei Tabellen/Listen laden, fehlende/gleiche/geaenderte Werte markieren. |
| `data-006` | Text-Diff | In Dokumentvergleich | Zwei Texte/PDF-Texte vergleichen; nur bauen, wenn UI stark und verstaendlich. |
| `workflow-001` | Smart Suggestions nach jedem Ergebnis | Core | `Shell.showWorkflowNextSteps()` generalisieren und testen. |
| `workflow-002` | Datei-Zustand in Mappe | Core | Mappe-v2-Metadaten und Badges. |
| `workflow-004` | Problemfrage statt Toolsuche | Core | Hub-Concierge weiter zum Workflow-Builder ausbauen. |
| `workflow-005` | Session-Merkliste | Core spaeter | Mappe export/import als ZIP inklusive Manifest. |
| `workflow-006` | Vorher-Nachher-Verlauf pro Datei | Core | Version-Graph in Mappe v2. |
| `mobile-001` | Mobile Schnellmodus | Querschnitt | Jede Tool-Seite bekommt eigene Mobile-Akzeptanztests. |
| `mobile-002` | Kamera direkt in Beleg/PDF | Mobile-Flow | Kamera-Capture als Input fuer Beleg/PDF-Foto-Workflows. |
| `security-001` | Datei-Metadaten-Check | In Metadata-Tool | Vorher/Nachher-Verifikation mit echten EXIF-Dateien. |

## Shortlist: Gate-Regeln

| ID | Idee | Erst bauen wenn |
|---|---|---|
| `pdf-flow-004` Druck-Fixer A4 | Wir robuste Preview/Scale/Print-Margins lokal verifizieren koennen. |
| `pdf-flow-009` PDF-Vergleich | Zwei aehnliche Dokumente automatisch erkannt und sinnvoll geroutet werden. |
| `office-002` Aktenzeichen- und Fristenfinder | OCR stabil genug ist und Ergebnis als Spickzettel wirklich hilft. |
| `office-007` Signaturblock-Generator | Als schneller Copy-/Mail-Output gut genug wirkt. |
| `daily-003` Materialrechner | Er schneller/besser als "kurz ChatGPT fragen" ist. |
| `workflow-003` Ein-Klick-Workflows | Versioning, Plan-Preview und QA stabil sind. |

## Later / Open

- `pdf-flow-007` PDF-Formular lokal ausfuellen: spaeter, weil Formularfelder/Flattening viele Edge-Cases haben.
- `pdf-flow-010` QR-Code auf PDF platzieren: gute Idee, aber erst als Folgeaktion von QR-Code + PDF-Mappe sauber designen.

## Was schlechte Fragen waren

Die Downvotes sind wichtig:

- "Welche Datei-Zustaende brauchen wir zuerst?" war falsch, weil CLAWBUIS das entscheiden muss.
- "Welcher PDF-Block hat Prioritaet?" war falsch, weil alle Kern-PDFs zusammen synergieren muessen.
- "Welche Ideen als Optionen?" war falsch, weil das Produkturteil bei CLAWBUIS liegt.

Regel fuer die App:

> Frage den User nicht nach Produktarchitektur. Frage nur nach seinem Ziel, seinem Dokument, seiner Unsicherheit oder einer echten Entscheidung im aktuellen Workflow.

## 40-Final-Feedback-Protokoll

Bevor der grosse Umbau live geht, sammeln wir bis zu 40 finale Feedbackpunkte in einem einheitlichen Format:

| Feld | Zweck |
|---|---|
| `id` | Stabiler Feedback-Key, z.B. `F40-001`. |
| `origin` | Samir, iPhone, Desktop, Freundin, Testkunde. |
| `tool_or_flow` | Hub, Mappe, pdf-sign, video-gif usw. |
| `severity` | P0 kaputt, P1 verwirrend, P2 polish, P3 Idee. |
| `quote` | Originalwortlaut, Tippfehler erhalten. |
| `interpreted_need` | Was wirklich gebraucht wird. |
| `decision` | build, fix, test-only, defer, reject. |
| `test_required` | Ja/nein + Test-ID. |
| `status` | open, planned, implemented, verified. |

Release-Regel:

- Jeder P0/P1-Punkt braucht einen Test.
- Jeder `build`-Punkt braucht eine Akzeptanzbedingung.
- Kein Punkt darf nur "verstanden" sein; er muss entschieden sein.

