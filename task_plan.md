# Office Tools Final Feedback Plan - 2026-05-04

## Ziel

Die zwei Workflow-Lab-Exporte und die bisherigen Office-Tools-Feedbacks werden in einen belastbaren Umbauplan fuer `tools.clawbuis.com` uebersetzt: Produktlogik, Bauphasen, Testmatrix und Release-Gates.

## Phasen

| Phase | Status | Ergebnis |
|---|---|---|
| 1. Quellen lesen | complete | Zwei JSON-Exporte, bestehender Masterplan, Feedback-Wave, Mappe-Briefing und Office-NG-Action-Logik gelesen. |
| 2. Produktentscheidung verdichten | complete | Build-/Shortlist-/Interview-Signale zu klaren App-Regeln und Nicht-Bauen-Regeln geformt. |
| 3. Umbau-Blueprint schreiben | complete | Architektur, Datenmodell, Concierge-Routing, Mappe v2 und lokale Kostenstrategie festgelegt. |
| 4. QA-Matrix schreiben | complete | Automatisierte, manuelle und Realgeraete-Tests definiert. |
| 5. Masterplan verlinken | complete | Bestehenden Masterplan auf die neuen Artefakte aktualisiert. |
| 6. Abschlusscheck | complete | Dateien geprueft, Tests gruen, keine Online-Aktion. |
| 7. Workflow-Builder v1 bauen | complete | Freitext erzeugt lokalen editierbaren Workflow mit Synonym-, Familien- und Mobile-Regressiontests. |
| 8. Workflow-Abarbeitung bauen | complete | Tool-Ergebnisse speichern in Mappe, geplanter naechster Schritt ersetzt Standardvorschlaege und bekommt passende Datei. |
| 9. Master-Agent Concierge bauen | complete | Sicherer Gemini-Flash-Proxy vorbereitet, lokaler Fallback bleibt aktiv, Startphase komprimiert und Datei-Ziele in den Concierge gemischt. |
| 10. Office-Visual-Upgrade | complete | Schwarzes Office-Logo, Canvas-Agent-Topologie, weniger Text und mobile Concierge-Fix umgesetzt. |
| 11. Agent-Workspace verdichten | complete | Mappe und Tool-Galerie in den Concierge-Arbeitsmodus integriert; manuelle Kacheln sind Fallback, Auswahlfaelle werden vor Start angezeigt. |
| 12. Wunsch-Weg-Arbeitsflaeche | complete | Grundmetapher von Tool/Workflow auf Alltagssprache umgestellt: Datei liegt da, Wunsch auswaehlen oder sagen, CLAWBUIS baut den Weg. |
| 13. KI als optionalen Modus zuruecksetzen | complete | Normale Mappe- und Werkzeugoberflaeche bleibt sichtbar; KI-Wegmodus ist bewusst oeffnender Zusatzmodus. |

## Aktive Entscheidungen

- Der aktive Produktanker ist nur `projects/tools` / `tools.clawbuis.com`.
- Kein weiterer Kachel-Ausbau als Primaerstrategie.
- Der Hauptmodus wird: Datei rein, Ziel sagen, Workflow sichtbar editieren, dann Schritt fuer Schritt abarbeiten.
- Standardrouting lokal und kostenlos; nur bei Mehrdeutigkeit oder komplexer Planbildung optional ein extrem kleiner KI-Router.
- Mappe v2 ist ein Workspace mit Originalen, Ergebnissen, Versionen, Zustaenden und Verlauf, kein Dateikorb.

## Artefakte

- `docs/office-tools-final-feedback-synthesis-2026-05-04.md`
- `docs/office-tools-rebuild-blueprint-2026-05-04.md`
- `docs/office-tools-qa-matrix-2026-05-04.md`

## Fehlerlog

| Fehler | Ursache | Fix |
|---|---|---|
| Vorheriger Kontext driftete auf Smart Fitness | Produktanker nicht hart gegen letzten User-Input geprueft | Office-Tools-Kontext ist fuer diese Session exklusiv gesetzt und in `evolution-log.md` persistiert. |
| Erste `token_watcher --boot` Ausfuehrung ohne Argument | CLI verlangt Session-Typ | Mit `office-tools-final-feedback` neu ausgefuehrt. |
| PowerShell `rg` mit Regex-Pipe wurde falsch interpretiert | Shell-Quoting bei kombinierten Suchmustern | Suchbegriffe getrennt ausgefuehrt. |
| Router nahm bei Bild-/Video-Intent noch PDF-Kompression mit | Generische Keywords wie `runter` waren staerker als Datei-Familie | `requestedFamilies` + Regressiontests fuer Bild/Video/PDF-Routing. |
| Standardvorschlaege konnten einen geplanten Workflow ueberschreiben | Ergebnis-Handoff kannte aktive Plaene nicht | `Shell.showWorkflowNextSteps()` liest aktive Workflows und rendert Workflow-Handoff vor generischen Suggestions. |
| Gemini-Key darf nicht in den Browser | Browser-Key waere auslesbar und abrechenbar | Neuer lokaler/Server-Proxy `/api/concierge/plan`; Client sendet nur Zieltext + Dateiarten, keine Dateien/Dateinamen. |
| Hinterlegter Gemini-Key ist aktuell abgelaufen | Google API antwortet `API key expired` | UI faellt auf lokalen Router zurueck und markiert `Lokal · Gemini pruefen`, ohne Workflow zu blockieren. |
 
## Zusatz-Fixes 2026-05-05

| Fehler | Ursache | Fix |
|---|---|---|
| Office-Hub nutzte farbige Cosmos-Marke | Office-NG braucht oben links die schwarze/dunkle Office-Marke | Header waehlt bei `tag: TOOLS` die schwarze Office-Logo-Variante; Fallback-Marke bleibt fuer andere Shell-Kontexte. |
| Mobile Concierge wurde rechts abgeschnitten | spaeter CSS-Override setzte nach dem alten Mobile-Block wieder Desktop-Spalten | Neuer `max-width: 900px` Override erzwingt `grid-template-columns: 1fr`. |
| Mappe und Werkzeugliste wirkten wie zweite Bedienmodi | Agent oben war richtig, aber unterhalb blieb die alte Kachel-App dominant | Agent-Dock zeigt Dateien + naechste Aktion, Detailmappe ist kompakt, Nicht-PDF-Werkzeuge sind eingeklappt. |
| Single-Input-Tools mit mehreren Dateien fuehlten sich wie "nichts passiert" an | OCR oeffnet korrekt einen Picker, aber der Plan kuendigte diese Auswahl vorher nicht klar an | Plan, Dock und Startbutton markieren "Auswahl noetig"; Realtest mit validen PDFs prueft Picker -> Editor. |
| Grundidee wirkte noch wie Online-Tool mit KI-Schicht | Zu viele technische Begriffe und Toolnamen im ersten Blickfeld | Neue Wunsch-Weg-Sprache, Alltagsziel-Karten und Smart/Local-Status ohne Key-/Provider-Sprache. |
| KI-Modus verdraengte die normale Tools-App | Agent-Vision wurde zu stark als Primaeroberflaeche interpretiert | KI-Wegmodus eingeklappt; Mappe + Tool-Sektionen bleiben sichtbar; `hub-has-files` macht die Startflaeche nach Upload kompakt. |
| Upload-Hero war nach Dateien zu hoch | Ein Grid-`gap` wirkte horizontal und vertikal und erzeugte grosse Zeilenluecken | `column-gap` und `row-gap` getrennt; Mobile-Topologie horizontal verdichtet. |
