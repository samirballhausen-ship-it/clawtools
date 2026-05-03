# Session-Briefing v2 — Datei-Mappe als HUB-zentraler Workflow

> **Status v1 (DEPRECATED):** Briefing v1 hat den Workflow falsch erfasst. Mappe wurde als Side-Feature mit Picker-Button gebaut. Samirs Reaktion: "das war nicht was ich wollte, ich sehe es gar nicht".
> **Status v2:** Workflow-First. User-Story bevor Tech.
> **Pre-Session: Samir muss User-Story validieren BEVOR Build-Session startet.**

---

## ABSCHNITT 1 — User-Story (5 Schritte, KEIN Tech-Jargon)

**Schritt 1 — Landing**
Samir öffnet `tools.clawbuis.com` auf seinem iPhone. Er sieht direkt unter dem Header eine **große, einladende Drop-Zone**: „Wirf deine Dateien rein". Größer als alles andere auf der Seite. Wirkt wie der Hauptzweck der Seite.

**Schritt 2 — Hochladen**
Samir tippt drauf, wählt 3 PDFs vom Handy. Sofort erscheinen sie als **3 große visuelle Karten** auf der Hub-Seite — direkt unter der Drop-Zone. Jede Karte zeigt: Datei-Name, Größe, Typ-Icon, Datum, kleine Vorschau wenn möglich. Pro Karte: "X" zum Entfernen.

**Schritt 3 — Aktion wählen**
Samir scrollt runter, sieht die Tool-Kacheln. Er tippt „PDF zusammenfügen". Beim Klick: Loading-Indicator + Toast „2 PDFs werden mitgenommen…".

**Schritt 4 — Tool mit vorgeladenen Dateien**
Tool-Seite öffnet sich. Samir sieht **die 2 passenden PDFs schon im Queue** (kein Drop nötig). Über dem Queue: Banner „2 Dateien aus deiner Mappe geladen". Pro File-Row: „×" zum Entfernen aus diesem Tool (bleibt aber in der Mappe).
Plus: Drop-Zone bleibt sichtbar — er kann zusätzliche Dateien hochladen die zur Mappe und zu diesem Tool zugleich.

**Schritt 5 — Final-State (PERSISTENCE-PFLICHT)**
Samir wählt Reihenfolge per Drag, klickt „Mergen", lädt das Ergebnis runter.

**KRITISCH:** Wenn Samir jetzt zurück zur Startseite navigiert, MÜSSEN alle 3 Original-PDFs immer noch da sein — exakt wie nach Schritt 2.

Persistence-Bedingungen (alle MUSS):
- Tool benutzt → Mappe behält alle Files
- Browser-Tab geschlossen + neu geöffnet → Files noch da
- Browser komplett geschlossen + Stunden später → Files noch da
- Page-Reload (F5) → Files noch da
- Per-Tool-Verarbeitung (z.B. Mergen) → Original-Files unverändert in Mappe
- Mehrere Tools hintereinander mit denselben Files → Files bleiben durchgängig

Files verschwinden NUR wenn Samir explizit:
- Auf das ×-Symbol einer File-Card klickt (löscht NUR diese eine)
- Im Mappe-Modal „Alles löschen" wählt (mit Bestätigung)
- Oder Browser-Daten manuell löscht (Browser-Einstellungen)

Niemals automatisch nach Tool-Use, niemals nach Reload, niemals beim Service-Worker-Update.

---

## ABSCHNITT 2 — Anti-Story (NICHT so)

**NICHT: Mappe als kleines Side-Panel**
Falsch: Header-Icon mit Counter + ausklappbares Sticky-Banner unter Hero. Zu klein, zu beiläufig.
Richtig: Mappe = **prominent als Haupt-Element** auf Hub. Wenn nicht-leer → die File-Karten füllen die Hub-Seite oben aus, Tool-Kacheln rutschen runter.

**NICHT: Per-Tool „Aus Mappe wählen" Button**
Falsch: User muss im Tool extra Button drücken um Mappe-File zu nutzen.
Richtig: Klick auf Tool aus Hub → Tool-Page lädt File **automatisch** vorgeladen. Kein Picker, keine extra Aktion.

**NICHT: Mappe als Storage-Sidebar**
Falsch: „Du hast was hochgeladen, jetzt klick hier um zu wählen."
Richtig: Mappe IST der Workspace. Hub = was-hab-ich + was-mache-ich-damit auf einer Seite.

**NICHT: Tool-First-Flow**
Falsch: User wählt Tool → bekommt Drop-Zone → entscheidet ob mappe oder neuer upload.
Richtig: User hat Files (in Mappe) → wählt was er damit will → Tool zieht passende Files automatisch rein.

---

## ABSCHNITT 3 — Mockup-Sketches (ASCII)

### Hub-Page mit 3 Files in Mappe (Mobile, 390px)

```
┌─────────────────────────────┐
│ [LOGO] CLAWBUIS    [?] [📁2]│  ← Header (Mappe-Icon + Counter klein)
├─────────────────────────────┤
│                             │
│   Werkzeuge die deinen      │  ← Hero
│   Alltag entlasten.         │
│   Alles im Browser.         │
│                             │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │  ⬆  WIRF DEINE DATEIEN  │ │  ← BIG Drop-Zone (Hauptelement!)
│ │     HIER REIN           │ │
│ │                         │ │
│ │  oder klicken           │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Deine Mappe (3 Dateien)     │  ← File-Library (sichtbar wenn nicht leer)
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ PDF  │ │ PDF  │ │ JPG  │ │
│ │ Vert.│ │ Lebe.│ │ Foto │ │
│ │ 2.4MB│ │ 1.1MB│ │ 4MB  │ │
│ │   ×  │ │   ×  │ │   ×  │ │
│ └──────┘ └──────┘ └──────┘ │
├─────────────────────────────┤
│ Was willst du damit machen? │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ PDF  │ │ Wass.│ │ Schwä│ │  ← Tool-Kacheln
│ │ merg.│ │ zeich│ │ rzen │ │
│ │ (2)  │ │ (2)  │ │ (2)  │ │  ← Counter zeigt: "2 deiner Dateien passen"
│ └──────┘ └──────┘ └──────┘ │
```

### Tool-Page nach Klick aus Hub (Mobile)

```
┌─────────────────────────────┐
│ [LOGO] CLAWBUIS    [?] [📁2]│
├─────────────────────────────┤
│ PDFs zusammenfügen          │
│ Reihenfolge per Drag.       │
├─────────────────────────────┤
│ ✓ 2 Dateien aus deiner      │  ← Toast/Banner "auto-loaded"
│   Mappe geladen.            │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 01  Vertrag.pdf  4 S. ×│ │  ← Files schon im Queue
│ │ 02  Lebenslauf.pdf 2S. ×│ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ ⬆ Weitere ablegen…      │ │  ← Drop-Zone bleibt für Add-Ons
│ └─────────────────────────┘ │
├─────────────────────────────┤
│  [  2 PDFs zusammenfügen  ] │  ← Action-Button
```

### Hub-Page LEER (erste Visit)

```
┌─────────────────────────────┐
│ [LOGO] CLAWBUIS    [?]      │  ← Kein Mappe-Counter weil leer
├─────────────────────────────┤
│   Werkzeuge die deinen      │
│   Alltag entlasten.         │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │  ⬆  WIRF DEINE DATEIEN  │ │  ← Drop-Zone immer noch da
│ │     HIER REIN           │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ODER suche dir ein Werkzeug:│
│ ┌──────┐ ┌──────┐ ┌──────┐ │  ← Tool-Kacheln direkt wenn keine Files
│ │ PDF  │ │ Bild │ │ Video│ │
│ └──────┘ └──────┘ └──────┘ │
```

---

## ABSCHNITT 4 — Tech (kommt absichtlich erst HIER)

### Was bleibt von v1

- IndexedDB-Layer in `/shared/mappe.js` (BREITE API: addFile, listFiles, getFile, deleteFile, clearAll, onChange)
- BroadcastChannel für Cross-Tab-Sync
- Header-Icon mit Counter (sekundär — Quick-Access)
- Privacy-Footer-Update
- sw.js Cache-Version-Bump

### Was MUSS NEU oder ANDERS sein

#### Hub `/index.html` — komplettes Re-Design

**Aktuell (v1-Output):** Smart-Suggest-Drop-Zone existiert, aber Mappe ist nur Sticky-Panel.

**Soll:**
1. **Drop-Zone-Hero** — direkt nach Hero, bevor alles andere. Mind. 200px hoch, big icon, klare CTA „Dateien hier ablegen oder klicken". Ist der visuelle Hauptpunkt.
2. **File-Library-Grid** — direkt unter Drop-Zone. Wenn Mappe nicht leer: grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) mit File-Cards (140-180px Karten). Bei leerer Mappe: nicht rendern.
3. **Tool-Kacheln mit Counter** — pro Tool prüfen wieviele Mappe-Files passen → „PDF mergen (2)" wenn 2 PDFs in Mappe. Sortierung: Tools mit passenden Files oben.
4. **Smart-Suggest-Zone** entfernen oder klein in Mappe-Drop-Zone integrieren (ist Teil davon).

#### Tool-Pages — Auto-Load aus Mappe

**Aktuell:** Tool zeigt Drop-Zone, separat „Aus Mappe wählen" Button.

**Soll:**
1. **URL-Parameter `?from=mappe`** beim Hub→Tool-Klick anhängen
2. Beim Tool-Page-Load: wenn Param gesetzt → automatisch alle passenden Mappe-Files in Tool-Queue laden
3. **Banner über Queue:** „2 Dateien aus deiner Mappe geladen — kannst einzelne entfernen"
4. **„×" pro Queue-Row** entfernt nur aus AKTUELLEM Tool, nicht aus Mappe (separates Mappe-Modal löscht endgültig)
5. Drop-Zone bleibt sichtbar als „Weitere ablegen…"-Variante

#### Hub-Click-Handler

Pro Tool-Kachel auf Hub: data-tool-accepts="application/pdf" o.ä. Beim Click:
1. Filter Mappe-Files nach accept-Pattern
2. Wenn ≥1 passend: navigate to `/tool/?from=mappe&ids=ID1,ID2` (IDs als Query)
3. Wenn 0 passend: normal navigate, kein from-Param
4. Tool-Page liest IDs aus Query → lädt aus Mappe

#### Per-Tool File-Picker (sekundär)

„Aus Mappe wählen"-Button bleibt im Tool, aber zweite Stelle nach der primären Drop-Zone — für Fall: User ist direkt auf Tool gelandet (z.B. Bookmark) und will doch Mappe-Files reinholen.

---

## ABSCHNITT 5 — Phasen (mit Akzeptanz-Tests pro Phase)

### Phase 1 — Audit + Cleanup (1h)

Was tun:
1. Lese Briefing v1 + dieses Briefing v2 + Diff
2. Inventur: was im Code von v1 ist gut? (mappe.js Storage-Layer ist wahrscheinlich OK)
3. Was muss UMGEBAUT? (Hub-Layout, Tool-Auto-Load, Picker-Reihenfolge)

Akzeptanz: Diff-Liste vor-Build erstellt.

### Phase 2 — Hub-Redesign (2h)

Was tun:
1. Drop-Zone-Hero einbauen direkt nach Hero (groß, prominent)
2. File-Library-Grid als visuelle Karten (Bild-Thumbnails, Name, Größe, Typ-Icon, Datum, ×-Button)
3. Smart-Suggest-Zone integrieren oder entfernen
4. Tool-Kacheln mit dynamischen Counter (Mappe-Files-Match-Count)
5. Mobile-First: Karten 1-2 Spalten auf 390px, mehr auf Desktop

Akzeptanz: Headless iPhone 13 — bei 3 Files in Mappe sieht man:
- ✓ Drop-Zone direkt nach Hero (mind. 180px hoch)
- ✓ 3 File-Cards visuell prominent
- ✓ Tool-Kacheln zeigen Counter wenn passend

### Phase 3 — Hub→Tool File-Übergabe (1.5h)

Was tun:
1. Per Tool-Kachel: data-tool-accepts und data-tool-id setzen
2. Click-Handler in shell.js: filter Mappe → URL bauen → navigate
3. Tool-Page-Init in shell.js: parse URL → call Tool-spezifischen Hook `Shell.onMappeAutoLoad(files)` der Tool implementiert
4. Pro Tool: Hook implementieren der Files in eigene Queue lädt

Akzeptanz: Headless — auf Hub Klick „PDF mergen" wenn 2 PDFs in Mappe → Tool-Page hat 2 Items im Queue + Banner sichtbar.

### Phase 4 — Tool-Banner + Per-Item-Remove (1h)

Was tun:
1. Banner-Component: „N Dateien aus Mappe geladen"
2. „×"-Button pro Tool-Row entfernt nur Tool-State, NICHT Mappe
3. Toast wenn entfernt: „Aus Tool entfernt — bleibt in Mappe"

Akzeptanz: Headless — × im Tool → Tool-Queue minus 1, Mappe-Counter bleibt.

### Phase 5 — Privacy-Update + sw-Bump (0.5h)

1. Privacy-Footer: erwähnt Mappe-Persistenz, Lokalität, Lösch-Möglichkeit
2. sw.js: Cache-Version bumpen → User bekommt Update
3. Bei sw-update: IndexedDB-Daten überleben (kein clear)

Akzeptanz: SW-Update getestet, Mappe-Files sind danach noch da.

### Phase 6 — Test-Suite + EIN Push (1h)

1. Erweitere `scripts/test-mappe.py` um die NEUEN User-Story-Akzeptanz-Tests:
   - Test A: Hub leer → Drop-Zone prominent, kein Library-Grid
   - Test B: 1 PDF hochladen → Library-Grid mit 1 Card, „PDF mergen (1)" Counter
   - Test C: Klick „PDF mergen" → Tool öffnet mit PDF im Queue + Banner
   - Test D: × im Tool entfernen → Tool-State -1, Mappe unverändert
   - Test E: Reload Tool-Page mit URL-IDs → File noch geladen
   - Test F: Mappe-Modal über Header-Icon erreichen, File löschen → Hub-Library updated live
   - Test G: Cross-Tab BroadcastChannel
   - Test H: Privacy-Footer Mappe-Erwähnung

   **PERSISTENCE-FOCUS-TESTS (HARD-PFLICHT):**
   - Test P1: 3 Files hochladen → Tool ausführen → zurück zu Hub → 3 Files noch da
   - Test P2: 3 Files hochladen → Browser-Context schließen + neu öffnen → 3 Files noch da (= echter Cold-Start, nicht F5)
   - Test P3: 3 Files hochladen → SW Cache-Version simulieren (alte Caches löschen) → Hub neu laden → 3 Files NOCH DA (IndexedDB ist getrennt von Cache)
   - Test P4: Mehrere Tools sequenziell mit denselben Files füttern → Mappe-Counter durchgängig konstant
   - Test P5: × auf File-Card → nur diese eine weg, andere bleiben
   - Test P6: „Alles löschen" mit Bestätigung → alle weg

2. ALLE 8 + 6 Persistence-Tests grün → EIN Commit, EIN Push

Akzeptanz: 14/14.

---

## ABSCHNITT 6 — Definition of Done (User-Story-First)

DOD ist erfüllt wenn ein Außenstehender, der nichts vom Code weiß, die User-Story aus Abschnitt 1 vollständig durchspielen kann ohne dass irgendwas nicht passt:

- [ ] **Schritt 1:** Hub geöffnet — Drop-Zone direkt sichtbar, größer als alles andere
- [ ] **Schritt 2:** 3 PDFs hochgeladen — erscheinen als 3 visuelle Karten direkt unter Drop-Zone
- [ ] **Schritt 3:** Tap „PDF zusammenfügen" — Toast „2 PDFs werden mitgenommen", Tool öffnet
- [ ] **Schritt 4:** Tool zeigt 2 PDFs schon im Queue + Banner „2 aus Mappe geladen"
- [ ] **Schritt 5:** Verarbeitung normal, Mappe behält alle 3 PDFs für nächstes Tool

**PERSISTENCE-AKZEPTANZ (kritisch — nach Schritt 5 zwingend zu testen):**
- [ ] Nach „Mergen" → Hub-Seite öffnen → alle 3 PDFs immer noch sichtbar in der Library
- [ ] Tab schließen, neu öffnen → 3 PDFs immer noch da
- [ ] Browser komplett schließen, Stunden später öffnen → 3 PDFs immer noch da
- [ ] F5-Reload auf Hub → 3 PDFs immer noch da
- [ ] Files nur weg wenn × geklickt oder „Alles löschen" bestätigt
- [ ] Service-Worker-Update löscht keine Mappe-Files (IndexedDB ist getrennt von SW-Cache)

PLUS technisch:
- [ ] sw v4 deployed, alte Caches gelöscht (aber IndexedDB bleibt)
- [ ] Cross-Tab-Sync funktional
- [ ] Mobile-Layout 390px sauber, kein Body-Overflow
- [ ] Privacy-Footer Mappe-Mention
- [ ] 8/8 Headless-Tests grün

---

## ABSCHNITT 7 — Validation-Gate

**BEVOR diese Session startet:** Samir liest Abschnitt 1+2+3 (User-Story, Anti-Story, Mockups). Bestätigt:
> „Ja, das ist genau das was ich will."

ODER:
> „Nein, das hier ist anders: …"

Erst nach OK: autonome Build-Session starten.

---

## Nächster Schritt — Was Samir jetzt tun muss

1. Lese Abschnitt 1 (User-Story 5 Schritte)
2. Lese Abschnitt 2 (Anti-Story)
3. Schau Abschnitt 3 (Mockups)
4. Sag mir: trifft das deine Vision oder nicht? Wenn nein, was fehlt?

Erst nach Validation gebe ich dir den NEUEN copy-paste-Prompt für die autonome Session.
