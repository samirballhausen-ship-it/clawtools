# Office Tools Findings - 2026-05-04

## Quellen

- `C:\Users\samir\Downloads\clawbes-tools-workflow-lab-2026-05-04.json`
- `C:\Users\samir\Downloads\clawbes-tools-workflow-lab-2026-05-04 (1).json`
- `docs/office-tools-masterplan-2026-05-04.md`
- `docs/feedback/FEEDBACK-WAVE-2026-05-02.md`
- `docs/feedback/SESSION-BRIEFING-datei-mappe-v2.md`
- `deploy/clawbuis-office-ng-engine.js`
- `core/knowledge/agentic-coding-mastery/15-concierge-action-failures.md`

## JSON-Signal

- 51 Ideen insgesamt.
- 19 Build.
- 6 Shortlist.
- 1 Later.
- 1 Open.
- 24 Discard.
- 33 Notizen.
- Export v2 enthaelt Analyse und 15 Interviewantworten.
- Interview: 8 gute Fragen, 3 schlechte Fragen.

## Hauptsignale aus Samirs Antworten

- Hauptmodus: Hybrid aus Datei-Mappe, Problemfrage und weiterhin sichtbarer Tool-Liste.
- Concierge soll Office-NG-Vibe bekommen: Ziel verstehen, Workflow bauen, aber visuell und editierbar zeigen.
- Eindeutige Intents sollen direkt geroutet werden; unsichere Intents bekommen Rueckfragen.
- Rueckfragen muessen echte Entscheidungen verbessern, nicht Samir Produktarbeit abnehmen lassen.
- Samir will nicht gefragt werden, welche PDF-Bloecke zusammengehoeren oder welche Badges zuerst gebaut werden. CLAWBUIS entscheidet das.
- Ergebnisse sollen herunterladbar sein, aber auch in der Mappe gespeichert werden koennen; dann greift Versionierung.
- Nach jedem Ergebnis sollen naechste Schritte sichtbar angeboten werden.
- Mappe soll Originale und bearbeitete Versionen trennen und Verlauf zeigen.
- Mobile ist ein eigener Standard, nicht nur Responsive-Nacharbeit.
- Keine irrefuehrenden KI-Versprechen, kein Login, keine Werbung, keine Cloud im Standardflow.

## Build-Cluster

1. Workflow-Registry und Smart Suggestions.
2. Mappe-Zustaende, Versionen und Verlauf.
3. PDF-Kernflows: organisieren, pruefen, schwaerzen, zusammenfuehren.
4. Optionen in bestehende Tools statt neue isolierte Kacheln.
5. Mobile und Sprache als eigener UX-Standard.

## Office-NG Transfer

- `update_field`: alles Eindeutige sofort in strukturierten State schreiben.
- `ask`: nur bei Unsicherheit, Konflikt oder niedriger Confidence.
- `show_preview`: Plan sichtbar und editierbar machen, bevor ein Workflow ausgefuehrt wird.
- Confidence-Regeln: explizit hoch, abgeleitet mittel-hoch, geraten niedrig, User-Bestaetigung final.
- Failure-Pattern aus Office-NG: Trust-Boundary, Range/Domain-Edges, Alias-Resolution, Preview-Race, Mobile-Overflow, Multi-Action-Partial-Failure.

## Bestehender App-Stand

- Hub-Concierge ist als erster lokaler Regelrouter eingebaut.
- `WORKFLOW_REGISTRY` existiert aktuell im Hub.
- `window.__CLAWBUIS_TOOLS_QA__.runHubChecks()` existiert.
- `scripts/test-mappe.py`: zuletzt 75/75 gruen.
- `scripts/test-mappe-v2.py`: zuletzt 26/26 gruen.
- Desktop/Mobile Playwright-Checks fuer `pdf-sign` Intent sind gruen.

