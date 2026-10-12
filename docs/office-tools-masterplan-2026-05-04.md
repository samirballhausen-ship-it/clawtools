# CLAWBUIS Tools Masterplan - 2026-05-04

## Neue Arbeitsdokumente

Dieser Masterplan bleibt die kurze Produktentscheidung. Die detaillierte Umbauplanung liegt hier:

- `docs/office-tools-final-feedback-synthesis-2026-05-04.md`
- `docs/office-tools-rebuild-blueprint-2026-05-04.md`
- `docs/office-tools-qa-matrix-2026-05-04.md`
- `docs/feedback/FINAL-FEEDBACK-40-2026-05-04.md`

Arbeitsgedaechtnis dieser Planung:

- `task_plan.md`
- `findings.md`
- `progress.md`

## Entscheidung

Wir bauen `tools.clawbuis.com` nicht als weitere Tool-Kachel-Sammlung weiter.
Der Produktkern ist:

1. Datei rein.
2. Ziel sagen.
3. CLAWBUIS erkennt lokal Datei-Typ, Zustand und Absicht.
4. Die App schlaegt einen sichtbaren Workflow vor.
5. Das Ergebnis bleibt in der Mappe, inklusive naechstem sinnvollen Schritt.

## Was gebaut wird

### 1. Workflow Registry

Gemeinsame Registry fuer alle Tools:

- Tool-Slug
- akzeptierte Dateitypen
- Problem-Keywords
- Output-Typ
- Folgeaktionen
- Confidence
- Mappe-Speicherregel

Startpunkt ist im Hub eingebaut: `WORKFLOW_REGISTRY` in `index.html`.
Naechster Schritt: als `shared/workflow-registry.js` auslagern, damit Hub,
Mappe-Gruppen, Tool-Seiten und QA dieselbe Wahrheit nutzen.

### 2. Problemfrage statt Toolsuche

Der Hub fragt nicht: "Welches Tool willst du?"
Er fragt: "Was soll am Ende rauskommen?"

Umgesetzt:

- Problemfrage-Block direkt unter der grossen Dropzone.
- Regelbasierte Vorschlaege ohne KI-Call.
- Beruecksichtigt vorhandene Mappe-Dateien.
- Oeffnet das Tool mit `?from=mappe&ids=...`, wenn passende Dateien vorhanden sind.

### 3. Mappe v2

Die bestehende IndexedDB-Mappe bleibt Kern. Sie wird ausgebaut zu:

- Originale bleiben getrennt von Ergebnissen.
- Versionen: `vertrag.pdf`, `vertrag_v2_signiert.pdf`, `vertrag_v3_komprimiert.pdf`.
- Datei-Zustaende: signiert, geschwaerzt, komprimiert, OCR, Wasserzeichen.
- Verlauf pro Datei: Quelle -> Aktion -> Ergebnis -> naechster Schritt.

### 4. Tool-Qualitaet vor Tool-Anzahl

Revenue kommt nicht aus 40 halbfertigen Tools, sondern aus wenigen belastbaren
Workflows, die auf iPhone und Desktop wirklich funktionieren:

- PDFs zusammenfuegen
- PDF komprimieren
- PDF signieren
- PDF schwaerzen
- PDF Wasserzeichen
- HEIC/JPG und Bilder komprimieren
- Tabellen/Excel
- Video erst nach ffmpeg-Stabilitaet

### 5. Regelprozess / QA

Code-Pass reicht nicht. Jeder Sprint bekommt reale Browser-Gates:

- Hub leer: Dropzone und Problemfrage sichtbar.
- Mappe seeded: Library sichtbar, Tool-Counter korrekt.
- Problemfrage: richtiges Tool auf Rang 1.
- Hub -> Tool: Dateien werden automatisch geladen.
- Tool-Remove: nur Tool-State aendert sich, Mappe bleibt erhalten.
- Mobile 390px: kein Horizontal-Overflow.
- Console: keine Fehler.
- Standardflow: keine KI-Calls.

Startpunkt ist eingebaut und getestet:

```js
window.__CLAWBUIS_TOOLS_QA__.runHubChecks()
```

Aktueller lokaler QA-Stand:

- `scripts/test-mappe.py`: 75/75 gruen.
- `scripts/test-mappe-v2.py`: 26/26 gruen.
- Playwright Desktop 1440px: Concierge rankt `pdf-sign` fuer "unterschreiben", Mappe zeigt 2 Dateien, kein Horizontal-Overflow.
- Playwright Mobile 390px: Concierge rankt `pdf-sign`, Mappe-Chips bleiben sichtbar, kein Horizontal-Overflow.
- `pdf-sign` Single-PDF-Flow: echte PDF aus Mappe oeffnet im Editor, keine Picker-Umwege.

## Reihenfolge

1. Feedback-Freeze: bis zu 40 finale Punkte erfassen, jeden P0/P1-Punkt einer Test-ID zuordnen.
2. Hub-Concierge + Workflow Registry im Hub. Status: umgesetzt und lokal verifiziert.
3. Registry auslagern nach `shared/workflow-registry.js`.
4. Workflow Router + editierbare Plan-Preview.
5. Mappe v2 Metadata-Schema: Versionen, Zustaende, Verlauf.
6. PDF-Kernflows stabilisieren: Merger, Compress, Sign, Redact, Watermark, OCR, Organizer.
7. Tool-spezifische Mobile-Fixes aus Feedback Wave.
8. Browser-QA-Suite pro Release.
9. Ein Push erst nach gruener lokaler QA.

## Nicht bauen

- Keine neue Kachel-Flut.
- Kein dunkles CLAWBUIS-Universum auf der Office-Tools-App.
- Keine irrefuehrenden KI-Versprechen.
- Keine Cloud-KI im Standardflow.
- Keine Online-Aenderung ohne lokalen Realtest.
