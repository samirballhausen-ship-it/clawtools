# Final Feedback 40 - CLAWBUIS Tools

Status: offen  
Ziel: Bis zu 40 finale Rueckmeldungen sammeln, bevor der grosse Umbau live geht. Jeder P0/P1-Punkt braucht eine Test-ID.

## Severity

| Severity | Bedeutung | Release-Regel |
|---|---|---|
| P0 | Flow kaputt, Tool nicht nutzbar, Datenverlust, Worker/WASM blockiert | Muss vor Release gefixt und getestet sein. |
| P1 | Nutzbar, aber verwirrend, mobile schlecht, falscher Output, irrefuehrende Sprache | Muss vor Release entschieden und meistens gefixt sein. |
| P2 | Polish, bessere UX, Copy, visuelle Aufwertung | Kann gebuendelt werden. |
| P3 | Neue Idee / spaeterer Hebel | Nur planen, nicht in aktuellen Umbau ziehen. |

## Entscheidungsstatus

| Status | Bedeutung |
|---|---|
| open | Rohfeedback erfasst, noch nicht entschieden. |
| planned | Entscheidung getroffen, Test/Umsetzung geplant. |
| implemented | Code umgesetzt, noch nicht verifiziert. |
| verified | Test gruen oder echter Realtest dokumentiert. |
| deferred | Bewusst spaeter. |
| rejected | Bewusst nicht bauen. |

## Tabelle

| ID | Origin | Tool/Flow | Severity | Original-Zitat | Interpreted Need | Decision | Test-ID | Status |
|---|---|---|---|---|---|---|---|---|
| F40-001 |  |  |  |  |  |  |  | open |
| F40-002 |  |  |  |  |  |  |  | open |
| F40-003 |  |  |  |  |  |  |  | open |
| F40-004 |  |  |  |  |  |  |  | open |
| F40-005 |  |  |  |  |  |  |  | open |
| F40-006 |  |  |  |  |  |  |  | open |
| F40-007 |  |  |  |  |  |  |  | open |
| F40-008 |  |  |  |  |  |  |  | open |
| F40-009 |  |  |  |  |  |  |  | open |
| F40-010 |  |  |  |  |  |  |  | open |
| F40-011 |  |  |  |  |  |  |  | open |
| F40-012 |  |  |  |  |  |  |  | open |
| F40-013 |  |  |  |  |  |  |  | open |
| F40-014 |  |  |  |  |  |  |  | open |
| F40-015 |  |  |  |  |  |  |  | open |
| F40-016 |  |  |  |  |  |  |  | open |
| F40-017 |  |  |  |  |  |  |  | open |
| F40-018 |  |  |  |  |  |  |  | open |
| F40-019 |  |  |  |  |  |  |  | open |
| F40-020 |  |  |  |  |  |  |  | open |
| F40-021 |  |  |  |  |  |  |  | open |
| F40-022 |  |  |  |  |  |  |  | open |
| F40-023 |  |  |  |  |  |  |  | open |
| F40-024 |  |  |  |  |  |  |  | open |
| F40-025 |  |  |  |  |  |  |  | open |
| F40-026 |  |  |  |  |  |  |  | open |
| F40-027 |  |  |  |  |  |  |  | open |
| F40-028 |  |  |  |  |  |  |  | open |
| F40-029 |  |  |  |  |  |  |  | open |
| F40-030 |  |  |  |  |  |  |  | open |
| F40-031 |  |  |  |  |  |  |  | open |
| F40-032 |  |  |  |  |  |  |  | open |
| F40-033 |  |  |  |  |  |  |  | open |
| F40-034 |  |  |  |  |  |  |  | open |
| F40-035 |  |  |  |  |  |  |  | open |
| F40-036 |  |  |  |  |  |  |  | open |
| F40-037 |  |  |  |  |  |  |  | open |
| F40-038 |  |  |  |  |  |  |  | open |
| F40-039 |  |  |  |  |  |  |  | open |
| F40-040 |  |  |  |  |  |  |  | open |

## Gate

- Alle P0 muessen `verified` sein.
- Alle P1 muessen `verified`, `deferred` mit Begruendung oder `rejected` mit Begruendung sein.
- Kein `build` ohne Test-ID.
- Kein `implemented` als finaler Status.

