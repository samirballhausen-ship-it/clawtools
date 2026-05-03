# Copy-Paste-Prompt für die Datei-Mappe-Refactor-Session (v2)

> Pasten in eine NEUE Claude Code Session. Working-Dir: `C:\Apps\CLAWBUIS\projects\tools`

---

## Der Prompt:

```
Hi, du übernimmst hier eine Refactor-Session für die Datei-Mappe.

Working-Dir: C:\Apps\CLAWBUIS\projects\tools (git-Repo, push deployt zu tools.clawbuis.com via Vercel)

KONTEXT: Eine vorherige Build-Session hat die Datei-Mappe gebaut (commit 837d692). Sie ist technisch funktional (9/9 Tests grün), aber der USER-WORKFLOW wurde falsch interpretiert. Samirs Reaktion: "das war nicht was ich wollte, ich sehe es gar nicht."

PFLICHT-LESE in DIESER Reihenfolge:
1. docs/feedback/SESSION-BRIEFING-datei-mappe-v2.md (NEUES Briefing — User-Story-First)
2. docs/feedback/SESSION-BRIEFING-datei-mappe.md (DEPRECATED v1 — als Kontrast: was falsch war)

Im v2-Briefing ist die User-Story als 5-Schritt-Geschichte beschrieben PLUS Mockups als ASCII PLUS explizite Anti-Story (was es NICHT ist). Halte dich strikt daran.

KRITISCHE ANFORDERUNG (Samir-Korrektur 2026-05-03):
- Datei-Mappe ist HUB-zentral, nicht Side-Feature
- Hub-Hauptelement = große Drop-Zone + visuelle File-Library-Grid
- Klick auf Tool aus Hub → Tool öffnet AUTOMATISCH mit passenden Files vorgeladen (kein Picker-Button)
- File-Persistence: nach Tool-Use, Reload, Browser-Restart bleiben ALLE Files in Mappe — bis User explizit löscht

WAS IM CODE BLEIBT (von v1 OK):
- shared/mappe.js (IndexedDB-Layer) — Storage funktioniert, behalten + ggf erweitern
- shared/mappe-ui.js (Modal-Komponente) — kann bleiben für Header-Icon-Modal
- BroadcastChannel-Setup — funktioniert, bleibt

WAS GRUNDLEGEND UMGEBAUT WIRD:
1. Hub-Seite (index.html): komplettes Re-Design — siehe Mockups in v2-Briefing
2. Per-Tool: KEIN "Aus Mappe wählen"-Button als primärer Flow mehr — sondern automatischer Auto-Load via URL-Param ?from=mappe&ids=…
3. Tool-Page-Init: parsed URL → lädt Files aus Mappe → Banner "X aus Mappe geladen"
4. Pro Tool: × in Queue entfernt nur Tool-State, NICHT Mappe-File

PHASEN (siehe v2-Briefing Abschnitt 5):
1. Audit + Diff (1h)
2. Hub-Redesign (2h)
3. Hub→Tool File-Übergabe (1.5h)
4. Tool-Banner + Per-Item-Remove (1h)
5. Privacy-Update + sw-Bump (0.5h)
6. Test-Suite (8 + 6 Persistence-Tests) + EIN Push (1h)

Total ~7h.

REGELN (HART):
- Alle Änderungen LOKAL sammeln, EIN finaler Commit + EIN Push am Ende = 1 Vercel-Build
- Keine Einzel-Pushes pro Phase
- Headless-Tests mit Playwright nach jeder Phase
- Mobile-First (iPhone 13 Viewport 390x844)
- Endbenutzer-Sprache, KEINE Library-Namen im UI
- Privacy: 100% lokal, IndexedDB, kein Tracking
- IndexedDB-Daten dürfen NIEMALS automatisch gelöscht werden — nur User-Aktion
- Service-Worker Cache-Bump auf v4 — aber IndexedDB ist davon UNBETROFFEN

DEFINITION OF DONE (User-Story durchspielbar):
Ein Außenstehender muss die 5-Schritt-User-Story aus v2-Briefing Abschnitt 1 vollständig durchspielen können. Zusätzlich Persistence-Akzeptanz: nach Tool-Use, Reload, Browser-Restart bleiben Files da.

Test-Files lokal:
- C:/Apps/2026/Aufstocken/PDF_Bericht/Option-A-Kniestock.pdf (18 Seiten)
- C:/Apps/2026/Aufstocken/PDF_Bericht/Option-B-Dachanhebung.pdf
- C:/Apps/CLAWBUIS/deliveries/lumera-instagram-profile-2026-05-01/01_holographic_crown.jpg
- C:/Apps/clawbuis-demo-store/scripts/test-4page.docx

Aktueller HEAD: 837d692 (Datei-Mappe v1 deployed). Du fängst mit Refactor an.

Bei Frage: lieber Defaults wählen + dokumentieren statt User fragen.

Los — fang mit Phase 1 (Audit) an: lese den existierenden Code, identifiziere was bleibt und was umgebaut werden muss, dann TodoWrite mit allen Phasen.
```

---

## Was Samir nach Session-Ende prüft

Wenn die Session „done" meldet:

1. Mir hier sagen → ich verifiziere headless gegen Production (sobald Vercel-Bot-Challenge weg ist) ODER lokal gegen localhost:8772
2. Ich teste die User-Story Schritt für Schritt:
   - Hub leer → Drop-Zone prominent
   - 3 PDFs uploaden → 3 Karten sichtbar
   - „PDF mergen" tippen → Tool mit 2 vorgeladenen PDFs
   - Im Tool × → nur Tool-State runter, Mappe unverändert
   - Zurück zu Hub → 3 Karten noch da
   - F5 → 3 Karten noch da
   - Tab schließen + neu → 3 Karten noch da
3. Bei Bug → ich fixe direkt
4. Bei OK → wir machen das nächste Feature

---

## Was ich (vorherige Session, das hier) heute erledigt habe

- ✅ Selbstkorrektur durchgezogen (Briefing v1 als deprecated markiert)
- ✅ v2-Briefing geschrieben mit User-Story-First, Mockups, Anti-Story
- ✅ Memory-File für Wiederholungs-Fehler-Vermeidung persistiert
- ✅ Persistence-Akzeptanz-Tests im DOD verankert
- ⏸ KEIN Code-Push diese Session — die Refactor-Session macht das in einem
