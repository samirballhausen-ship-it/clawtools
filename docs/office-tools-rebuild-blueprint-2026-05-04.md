# CLAWBUIS Tools - Rebuild Blueprint

Datum: 2026-05-04  
Scope: `projects/tools` / `tools.clawbuis.com`  
Ziel: Lokaler, kostenloser Office-Workflow-Workspace auf Basis von Mappe v2, Concierge und echten Tool-Flows.

## North Star

> Ein Nutzer legt Dateien rein, sagt sein Ziel, sieht einen verstaendlichen Workflow, kann ihn korrigieren und arbeitet ihn ohne erneutes Hochladen durch.

## Umsetzungsstand 2026-05-04

Workflow-Builder v1 ist im Hub implementiert:

- Registry und Router laufen lokal im Browser: `shared/workflow-registry.js`, `shared/workflow-router.js`.
- Freitext erzeugt keinen flachen Tool-Treffer mehr, sondern einen sortierten Workflow-Plan.
- Der Plan ist editierbar: Schritte verschieben, entfernen, hinzufuegen, danach bestaetigt starten.
- Kritische Synonyme aus dem Feedback sind abgedeckt: `auslesen`, `OCR`, `Text erkennen`, `runter machen`, `kleiner`, `E-Mail`.
- Familien-Routing verhindert falsche Ketten: Bild-/Video-Intent bleibt bei Bild-/Video-Tools statt versehentlich PDF-Kompression mitzunehmen.
- Workflow-Abarbeitung ist angebunden: Wenn ein aktiver Plan laeuft, ersetzt der geplante naechste Schritt die normalen "Was als Naechstes?"-Vorschlaege. Ergebnisse werden in der Mappe gespeichert und direkt an das naechste Tool uebergeben; bei unpassendem Format wird die Originaldatei genutzt, bei fehlender Datei oeffnet der Schritt bewusst manuell.
- Browser-only KI-Routing bleibt naechster Evolutionsschritt: Transformers.js/WebGPU kann spaeter lokale Embeddings liefern, ohne Serverkosten. V1 bleibt deterministisch und kostenlos.

## Zielarchitektur

### Module

| Modul | Datei | Aufgabe |
|---|---|---|
| Workflow Registry | `shared/workflow-registry.js` | Eine Wahrheit fuer Tools, Inputs, Outputs, Keywords, Optionen, Folgeaktionen. |
| Workflow Router | `shared/workflow-router.js` | Lokal Intent + Mappe + Tool-Registry zu Vorschlaegen/Plan routen. |
| Workflow Plan UI | `shared/workflow-plan-ui.js` | Editierbare Plan-Karte, Steps loeschen, Datei-Zuordnung aendern, ausfuehren. |
| Mappe v2 | `shared/mappe-v2.js` oder Erweiterung `mappe.js` | Versionen, Zustaende, Verlauf, Original/Result-Gruppen. |
| Workflow Next Steps | `shared/shell.js` | Ergebnisse in Mappe speichern und naechste Aktionen anbieten. |
| QA Harness | `shared/qa-harness.js` | Test-Fixtures, Seeding, Checks, Console-/Overflow-Gates. |
| Copy/Labels | `shared/copy.js` | Einfache Sprache, keine irrefuehrenden KI-Versprechen. |

## Datenmodell

### WorkflowTool

```js
{
  slug: "pdf-sign",
  label: "PDF signieren",
  accepts: ["application/pdf"],
  outputs: ["application/pdf"],
  keywords: ["signieren", "unterschreiben", "signatur"],
  actions: ["open_tool", "autoload_files"],
  options: [
    { id: "visual-signature", label: "Sichtbare Unterschrift" }
  ],
  nextTools: ["pdf-redact", "pdf-compress", "pdf-watermark", "pdf-ocr"],
  qualityGate: "stable",
  mobileGate: "required"
}
```

### WorkflowPlan

```js
{
  id: "wf_...",
  source: "local-router",
  confidence: 0.91,
  status: "draft|confirmed|running|done|blocked",
  userIntent: "ich muss das PDF unterschreiben und kleiner machen",
  steps: [
    {
      id: "step_1",
      tool: "pdf-sign",
      label: "PDF signieren",
      fileIds: [12],
      confidence: 0.96,
      reason: "Intent nennt unterschreiben und eine PDF liegt in der Mappe.",
      requiresConfirm: false
    },
    {
      id: "step_2",
      tool: "pdf-compress",
      label: "Kleiner fuer E-Mail",
      fileSource: "previous-result",
      confidence: 0.84,
      reason: "Intent nennt kleiner machen.",
      requiresConfirm: true
    }
  ],
  questions: []
}
```

### MappeItem v2

```js
{
  id: 12,
  familyId: "fam_vertrag_...",
  version: 1,
  role: "original|result",
  name: "vertrag.pdf",
  type: "application/pdf",
  size: 123456,
  states: ["original"],
  sourceTool: "hub",
  parentId: null,
  createdAt: 1760000000000,
  updatedAt: 1760000000000,
  history: [
    { event: "added", source: "hub", at: 1760000000000 }
  ]
}
```

### VersionEdge

```js
{
  fromId: 12,
  toId: 19,
  tool: "pdf-sign",
  action: "signed",
  label: "signiert",
  at: 1760000001000
}
```

## Routing-Regeln

### Confidence

| Confidence | Verhalten |
|---|---|
| `>= 0.90` | Direkt Top-Vorschlag + optionaler Startbutton. |
| `0.70 - 0.89` | Workflow-Plan sichtbar, kleine Bestaetigung vor Ausfuehrung. |
| `0.45 - 0.69` | 1-2 Rueckfragen mit Auswahloptionen. |
| `< 0.45` | Tool-Liste + Bitte um Ziel/Dateien, kein KI-Theater. |

### Harte Regeln

- Destruktive Aktionen immer bestaetigen.
- Multi-Step-Workflows immer als Plan zeigen.
- Mehrere passende Dateien bei Single-File-Tools: Picker oder Plan-Schritt mit Datei-Auswahl.
- Keine Datei-Inhalte an KI im Standardflow.
- KI darf nur Text-Intent bekommen, wenn lokales Routing unsicher ist.

## Optionaler KI-Router

Standard bleibt lokal. Wenn wir KI brauchen, dann nur so:

- Input: User-Text, Dateitypen, Dateinamen optional gekuerzt, keine Blob-Inhalte.
- Output: `WorkflowPlan` JSON.
- Model: billigstes schnelles Modell, gecacht nach normalisiertem Intent.
- Budget: harte Tages-/Session-Grenzen.
- Fallback: Wenn KI blockiert/kostet, lokaler Router bleibt nutzbar.

KI-Call-Situationen:

- Multi-Intent mit mehreren Dateitypen und unklarer Reihenfolge.
- User beschreibt Ziel sehr frei und lokaler Router findet nur niedrige Confidence.
- Plan-Refinement nach User-Korrektur.

Keine KI-Calls:

- Ein PDF + "unterschreiben".
- Zwei PDFs + "zusammenfuegen".
- Bild + "kleiner machen".
- QR-Code erstellen.
- Datei umbenennen nach Nummer.

## UX-Flows

### Empty Hub

1. Hero.
2. Grosse Dropzone.
3. Problemfrage.
4. Tool-Liste als Fallback.

Akzeptanz:

- Nutzer versteht in 5 Sekunden: Datei rein oder Ziel sagen.
- Keine leere Mappe-UI.

### Hub mit Dateien

1. Dropzone bleibt sichtbar fuer weitere Dateien.
2. Mappe v2 zeigt Gruppen: Originale, Ergebnisse, Versionen.
3. Concierge beruecksichtigt vorhandene Dateien.
4. Tool-Kacheln zeigen passende Datei-Anzahl.

Akzeptanz:

- User sieht seine Dateien ohne Header-Modal.
- Passende Tools stehen sichtbar hoeher oder sind markiert.

### Klarer Single-Intent

Beispiel: "PDF unterschreiben".

Verhalten:

- Router erkennt `pdf-sign`.
- Wenn eine passende PDF: Tool direkt mit Mappe-ID.
- Wenn mehrere PDFs: Auswahlkarte "Welche PDF unterschreiben?".

### Multi-Intent

Beispiel: "Videos kleiner machen, zwei PDFs zusammenfuegen und eins splitten".

Verhalten:

- Plan mit mehreren Steps.
- Jede Datei-Zuordnung sichtbar.
- User kann Step loeschen oder Datei tauschen.
- Start erst nach Bestaetigung.

### Nach Ergebnis

1. Download bleibt prominent.
2. "In Mappe speichern" oder Auto-Save je nach Tool-Regel.
3. Neue Version in Mappe.
4. Folgeaktionen: komprimieren, schwaerzen, wasserzeichnen, OCR, teilen.

## Sprint-Reihenfolge

### Sprint 0 - Feedback-Freeze und QA-Basis

- 40-Final-Feedback-Liste anlegen.
- P0/P1 in Test-IDs uebersetzen.
- Bestehende Tests auf Console-Error-Gate erweitern.

### Sprint 1 - Registry auslagern

- `WORKFLOW_REGISTRY` aus `index.html` nach `shared/workflow-registry.js`.
- Hub, MappeGrouped und Tests nutzen dieselbe Registry.
- Keine neue UI-Feature-Arbeit, bis diese Wahrheit zentral ist.

### Sprint 2 - Workflow Router + Plan Preview

- `shared/workflow-router.js`.
- `WorkflowPlan` erzeugen.
- Plan-Karte rendern.
- Editieren/Loeschen/Bestaetigen.

### Sprint 3 - Mappe v2 Schema

- Version-Familien.
- Datei-Zustaende.
- Verlauf pro Datei.
- Originale/Ergebnisse visuell trennen.
- Migration alter IndexedDB-Daten.

### Sprint 4 - PDF-Kernsynergie

- `pdf-sign`, `pdf-redact`, `pdf-compress`, `pdf-watermark`, `pdf-merger`, `pdf-splitter/pdf-organizer`.
- Jedes Tool: Auto-Load, Result-Save, Next-Steps, Mobile-Gate.

### Sprint 5 - P0/P1 Feedback Wave

- bg-remove WASM.
- ffmpeg/video.
- docx-zu-pdf.
- csv/xlsx.
- heic/jpg.
- qr mobile.
- exif rename/metadaten Sprache + Verifikation.

### Sprint 6 - High-Wow Additions

- Farb-Picker + Palette.
- Beleg-Scanner nur bei Qualitaet.
- PDF-Vergleich nur bei sicherer UX.
- Aktenzeichen/Fristen erst nach OCR-Stabilitaet.

## Nicht bauen

- Keine dunkle Marketing-App.
- Kein Chatbot als Hauptoberflaeche.
- Keine langen Tool-Erklaertexte in der UI.
- Keine technischen Labels wie "EXIF fallback" fuer normale Nutzer.
- Keine Spielzeug-Rechner.
- Keine Kachel nur weil eine Idee cool klingt.
