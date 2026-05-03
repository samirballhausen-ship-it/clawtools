"""
test-mappe-v2.py — Datei-Mappe v2 User-Story-Tests + Persistence-Tests
=======================================================================

Test-Klassen (laut SESSION-BRIEFING-datei-mappe-v2.md Phase 6):

User-Story (8):
  A: Hub leer -> Drop-Zone prominent (>=180px), kein Library-Grid
  B: 1 PDF hochladen -> Library-Grid mit 1 Card, "PDF mergen" Counter zeigt (1)
  C: Klick "PDF mergen" -> Tool oeffnet mit PDF im Queue + Banner
  D: x im Tool entfernen -> Tool-State -1, Mappe unveraendert (counter konstant)
  E: Reload Tool-Page mit URL-IDs -> File noch geladen
  F: Mappe-Modal ueber Header-Icon -> File loeschen -> Hub-Library updated live
  G: Cross-Tab BroadcastChannel funktional
  H: Privacy-Footer erwaehnt Mappe-Persistenz

Persistence (6):
  P1: 3 Files hochladen -> Tool ausfuehren -> zurueck zu Hub -> 3 Files noch da
  P2: 3 Files hochladen -> Context schliessen + neu oeffnen -> 3 Files noch da
  P3: 3 Files hochladen -> SW Cache loeschen simuliert -> Hub neu laden -> 3 Files NOCH DA
  P4: Mehrere Tools sequenziell mit denselben Files -> Mappe-Counter konstant
  P5: x auf File-Card -> nur diese eine weg
  P6: "Alles loeschen" mit Bestaetigung -> alle weg

Run:  python scripts/test-mappe-v2.py
"""
import asyncio
import http.server
import socketserver
import threading
import functools
import os
import sys
import time
from pathlib import Path

PORT = 8769
ROOT = Path(__file__).resolve().parent.parent  # projects/tools


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def start_server():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    httpd.allow_reuse_address = True
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


SEED_3_FILES_JS = """async () => {
    await Mappe.clearAll();
    const blob1 = new Blob(['%PDF-1 vertrag'], {type: 'application/pdf'});
    const f1 = new File([blob1], 'vertrag.pdf', {type:'application/pdf'});
    const blob2 = new Blob(['%PDF-1 lebenslauf'], {type: 'application/pdf'});
    const f2 = new File([blob2], 'lebenslauf.pdf', {type:'application/pdf'});
    const blob3 = new Blob([new Uint8Array(1024)], {type: 'image/jpeg'});
    const f3 = new File([blob3], 'foto.jpg', {type:'image/jpeg'});
    const id1 = await Mappe.addFile(f1, 'hub');
    const id2 = await Mappe.addFile(f2, 'hub');
    const id3 = await Mappe.addFile(f3, 'hub');
    return [id1, id2, id3];
}"""


async def run_tests():
    from playwright.async_api import async_playwright

    httpd = start_server()
    time.sleep(0.5)
    print(f"[server] http://127.0.0.1:{PORT}")

    failed = []
    passed = []

    def expect(label, condition, detail=""):
        if condition:
            passed.append(label)
            print(f"  PASS  {label}")
        else:
            failed.append((label, detail))
            print(f"  FAIL  {label}  {detail}")

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
            page = await context.new_page()

            errs = []
            page.on("pageerror", lambda exc: errs.append(str(exc)))
            page.on("console", lambda m: errs.append(f"[{m.type}] {m.text}") if m.type in ("error",) else None)

            # ─── Test A: Hub leer -> Drop-Zone prominent ───────────────────
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.evaluate("() => Mappe.clearAll()")
            await page.wait_for_timeout(150)
            empty_hub = await page.evaluate("""() => ({
                dropzoneH: document.getElementById('hubDropzone')?.offsetHeight || 0,
                dropzoneVisible: !!document.getElementById('hubDropzone'),
                libraryHidden: !document.getElementById('hubLibrary').classList.contains('has-files'),
                heading: document.getElementById('hubDropzoneHeading')?.textContent
            })""")
            expect("A: Drop-Zone >= 180px hoch (prominent)",
                   empty_hub["dropzoneH"] >= 180, str(empty_hub))
            expect("A: Library-Grid hidden bei leerer Mappe",
                   empty_hub["libraryHidden"] is True, str(empty_hub))
            expect("A: Drop-Zone heading 'Wirf deine Dateien hier rein'",
                   "Wirf" in empty_hub["heading"], str(empty_hub))

            # ─── Test B: 1 PDF hochladen -> Library + Counter ──────────────
            await page.evaluate("""async () => {
                const blob = new Blob(['%PDF test'], {type: 'application/pdf'});
                const file = new File([blob], 'test.pdf', {type:'application/pdf'});
                await Mappe.addFile(file, 'hub');
            }""")
            await page.wait_for_function(
                "() => document.getElementById('hubLibrary').classList.contains('has-files')",
                timeout=2000)
            await page.wait_for_function(
                "() => document.querySelector('.hub-tile-counter.show') !== null",
                timeout=2000)
            after_b = await page.evaluate("""() => {
                const tile = document.querySelector('.hub-tile[href=\"/pdf-merger\"]');
                return {
                    libraryCardCount: document.querySelectorAll('.hub-library-card').length,
                    pdfMergerCounterText: tile?.querySelector('.hub-tile-counter')?.textContent || '',
                    hasMatchClass: tile?.classList.contains('has-mappe-match'),
                    libraryCardName: document.querySelector('.hub-library-card-name')?.textContent
                };
            }""")
            expect("B: Library zeigt 1 Card",
                   after_b["libraryCardCount"] == 1, str(after_b))
            expect("B: pdf-merger Counter sichtbar",
                   "1" in after_b["pdfMergerCounterText"], str(after_b))
            expect("B: pdf-merger has-mappe-match class",
                   after_b["hasMatchClass"] is True, str(after_b))
            expect("B: Library-Card name = test.pdf",
                   after_b["libraryCardName"] == "test.pdf", str(after_b))

            # ─── Test C: Klick "PDF mergen" -> Tool mit File + Banner ──────
            await page.click('a.hub-tile[href="/pdf-merger"]')
            await page.wait_for_url("**from=mappe**", timeout=4000)
            await page.wait_for_function(
                "() => document.querySelector('.file-row') !== null",
                timeout=4000)
            await page.wait_for_selector(".mappe-autoload-banner", timeout=2000)
            after_c = await page.evaluate("""() => ({
                fileRowCount: document.querySelectorAll('.file-row').length,
                bannerPresent: !!document.querySelector('.mappe-autoload-banner'),
                bannerText: document.querySelector('.mappe-autoload-banner')?.textContent.trim().slice(0, 60),
                queueFileName: document.querySelector('.file-name')?.textContent
            })""")
            expect("C: Tool oeffnet mit 1 File-Row",
                   after_c["fileRowCount"] == 1, str(after_c))
            expect("C: Auto-Load-Banner sichtbar",
                   after_c["bannerPresent"] is True, str(after_c))
            expect("C: Banner erwaehnt 'aus deiner Mappe geladen'",
                   "aus deiner Mappe" in after_c["bannerText"], str(after_c))
            expect("C: Queue-File ist test.pdf",
                   after_c["queueFileName"] == "test.pdf", str(after_c))

            # ─── Test D: x im Tool -> Tool-State minus, Mappe unveraendert ─
            mappe_before = await page.evaluate("async () => (await Mappe.listFiles({})).length")
            await page.click(".file-remove")
            await page.wait_for_function(
                "() => document.querySelectorAll('.file-row').length === 0",
                timeout=2000)
            mappe_after = await page.evaluate("async () => (await Mappe.listFiles({})).length")
            expect("D: Tool-State minus 1 nach x-Klick",
                   mappe_before == 1 and mappe_after == 1, f"before={mappe_before} after={mappe_after}")
            expect("D: Mappe-Counter unveraendert (1)",
                   mappe_after == 1, str(mappe_after))

            # ─── Test E: Reload Tool-Page mit URL-IDs -> File noch da ──────
            current_url = page.url
            await page.reload(wait_until="networkidle")
            await page.wait_for_function(
                "() => document.querySelector('.file-row') !== null",
                timeout=4000)
            after_e = await page.evaluate("""() => ({
                fileRows: document.querySelectorAll('.file-row').length,
                fileName: document.querySelector('.file-name')?.textContent
            })""")
            expect("E: Reload mit ?from=mappe&ids -> File noch geladen",
                   after_e["fileRows"] == 1 and after_e["fileName"] == "test.pdf",
                   str(after_e))

            # Cleanup pdf-merger state for next tests
            await page.evaluate("() => Mappe.clearAll()")

            # ─── Test F: Header-Icon Modal -> File loeschen -> Hub updated ─
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.evaluate("""async () => {
                const blob = new Blob(['x'], {type: 'application/pdf'});
                await Mappe.addFile(new File([blob], 'modal-test.pdf', {type:'application/pdf'}), 'hub');
            }""")
            await page.wait_for_selector(".mappe-trigger", timeout=2000)
            await page.click(".mappe-trigger")
            await page.wait_for_selector(".mappe-backdrop.show", timeout=2000)
            await page.wait_for_selector(".mappe-file-card", timeout=2000)
            # Click delete on file in modal
            await page.click(".mappe-file-card .mappe-btn-danger")
            await page.wait_for_function(
                "() => !document.getElementById('hubLibrary').classList.contains('has-files')",
                timeout=2000)
            after_f = await page.evaluate("""() => ({
                libraryHidden: !document.getElementById('hubLibrary').classList.contains('has-files'),
                badgeHidden: document.querySelector('.mappe-trigger-badge')?.classList.contains('hidden')
            })""")
            expect("F: Modal-Delete entfernt File aus Hub-Library + Badge",
                   after_f["libraryHidden"] and after_f["badgeHidden"],
                   str(after_f))

            # Close modal
            try:
                await page.click(".mappe-dialog-close", timeout=500)
                await page.wait_for_function(
                    "() => !document.querySelector('.mappe-backdrop')",
                    timeout=2000)
            except Exception:
                pass

            # ─── Test G: Cross-Tab BroadcastChannel ─────────────────────────
            page2 = await context.new_page()
            await page2.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page2.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.evaluate("""async () => {
                const blob = new Blob(['cross-tab'], {type: 'application/pdf'});
                await Mappe.addFile(new File([blob], 'cross-tab.pdf', {type:'application/pdf'}), 'hub');
            }""")
            await page2.wait_for_function(
                "() => document.getElementById('hubLibrary').classList.contains('has-files')",
                timeout=3000)
            cross_tab = await page2.evaluate("""() => ({
                libraryVisible: document.getElementById('hubLibrary').classList.contains('has-files'),
                cardCount: document.querySelectorAll('.hub-library-card').length,
                cardName: document.querySelector('.hub-library-card-name')?.textContent
            })""")
            expect("G: Cross-Tab Library updated live (BroadcastChannel)",
                   cross_tab["libraryVisible"] and cross_tab["cardCount"] == 1,
                   str(cross_tab))
            expect("G: Cross-Tab File-Card name korrekt",
                   cross_tab["cardName"] == "cross-tab.pdf", str(cross_tab))
            await page2.close()

            # ─── Test H: Privacy-Footer Mappe-Persistenz ────────────────────
            await page.goto(f"http://127.0.0.1:{PORT}/pdf-merger/", wait_until="networkidle")
            await page.wait_for_selector("details.privacy", timeout=2000)
            privacy_text = await page.evaluate(
                "() => document.querySelector('details.privacy')?.textContent || ''")
            expect("H: Privacy-Footer erwaehnt Mappe + IndexedDB + Persistenz",
                   "Mappe" in privacy_text and "IndexedDB" in privacy_text and ("erhalten" in privacy_text or "bleibt" in privacy_text),
                   privacy_text[-200:])

            # Cleanup
            await page.evaluate("() => Mappe.clearAll()")

            # ═════════════════════════════════════════════════════════════
            # PERSISTENCE TESTS P1-P6
            # ═════════════════════════════════════════════════════════════

            # ─── P1: 3 Files -> Tool ausfuehren -> Hub -> 3 Files noch da ──
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.wait_for_timeout(400)  # let Hub-JS register onChange listeners
            ids = await page.evaluate(SEED_3_FILES_JS)
            await page.wait_for_function(
                "() => document.querySelectorAll('.hub-library-card').length === 3",
                timeout=3000)
            # Navigate to a tool with auto-load
            await page.click('a.hub-tile[href="/pdf-merger"]')
            await page.wait_for_url("**from=mappe**", timeout=4000)
            await page.wait_for_function(
                "() => document.querySelectorAll('.file-row').length === 2",
                timeout=4000)
            # Go back to hub
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.wait_for_timeout(800)  # give Hub-JS time to refresh after navigation
            p1 = await page.evaluate("""async () => ({
                hubCardCount: document.querySelectorAll('.hub-library-card').length,
                mappeCount: (await Mappe.listFiles({})).length,
                names: (await Mappe.listFiles({})).map(f => f.name).sort()
            })""")
            expect("P1: 3 Files -> Tool -> zurueck Hub: Mappe behaelt alle 3",
                   p1["mappeCount"] == 3, str(p1))
            expect("P1: Hub-Library rendert alle 3 Cards (nach Tool-Use)",
                   p1["hubCardCount"] == 3, str(p1))
            expect("P1: Filenames intakt (foto.jpg, lebenslauf.pdf, vertrag.pdf)",
                   p1["names"] == ["foto.jpg", "lebenslauf.pdf", "vertrag.pdf"], str(p1["names"]))

            # ─── P2: Context schliessen + neu oeffnen -> Files noch da ─────
            # Simulate cold-start by closing context + creating new one
            await context.close()
            context = await browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
            page = await context.new_page()
            errs2 = []
            page.on("pageerror", lambda exc: errs2.append(str(exc)))
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            # Note: New context = new origin storage (Playwright contexts are isolated)
            # So we cannot directly test cold-start across contexts. Instead, we verify
            # within the SAME context that reload preserves data, plus test #P3 simulates
            # SW-cache-clear on the *same* context.
            # For a true cold-start test, the user needs persistent state — Playwright's
            # context is ephemeral by default.
            #
            # Instead, do a strict reload-test (still meaningful):
            await page.evaluate(SEED_3_FILES_JS)
            await page.wait_for_function(
                "async () => (await window.Mappe.listFiles({})).length === 3",
                timeout=3000)
            await page.wait_for_function(
                "() => document.querySelectorAll('.hub-library-card').length === 3",
                timeout=3000)
            await page.reload(wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.wait_for_function(
                "async () => (await window.Mappe.listFiles({})).length === 3",
                timeout=3000)
            await page.wait_for_function(
                "() => document.querySelectorAll('.hub-library-card').length === 3",
                timeout=3000)
            p2 = await page.evaluate("""() => ({
                cardCount: document.querySelectorAll('.hub-library-card').length
            })""")
            expect("P2: Reload (F5) -> alle 3 Files noch da",
                   p2["cardCount"] == 3, str(p2))

            # ─── P3: SW Cache-Clear simuliert -> Files noch da ─────────────
            # Clear all browser caches (CacheStorage), but NOT IndexedDB
            await page.evaluate("""async () => {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }""")
            await page.reload(wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.wait_for_function(
                "async () => (await window.Mappe.listFiles({})).length === 3",
                timeout=3000)
            await page.wait_for_function(
                "() => document.querySelectorAll('.hub-library-card').length === 3",
                timeout=3000)
            p3 = await page.evaluate("""() => ({
                cardCount: document.querySelectorAll('.hub-library-card').length
            })""")
            expect("P3: SW Cache-Clear -> IndexedDB ueberlebt, alle 3 Files da",
                   p3["cardCount"] == 3, str(p3))

            # ─── P4: Mehrere Tools sequenziell -> Counter konstant ─────────
            counter_start = await page.evaluate(
                "async () => (await Mappe.listFiles({})).length")
            for slug in ["pdf-merger", "pdf-compress", "pdf-watermark"]:
                # Direct navigate (bypass click intercept since we want raw count check)
                await page.goto(f"http://127.0.0.1:{PORT}/{slug}/?from=mappe&ids={ids[0]},{ids[1]}",
                                wait_until="networkidle")
                # Wait for auto-load to fire
                await page.wait_for_timeout(500)
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            counter_end = await page.evaluate(
                "async () => (await Mappe.listFiles({})).length")
            expect("P4: 3 Tools sequenziell mit denselben Files -> Counter konstant",
                   counter_start == counter_end == 3,
                   f"start={counter_start} end={counter_end}")

            # ─── P5: x auf File-Card -> nur diese eine weg ─────────────────
            await page.wait_for_function(
                "async () => (await window.Mappe.listFiles({})).length === 3",
                timeout=3000)
            await page.wait_for_function(
                "() => document.querySelectorAll('.hub-library-card').length === 3",
                timeout=3000)
            # Hover one card to make remove button visible (mobile = always visible)
            await page.click(".hub-library-card .hub-library-card-remove")
            await page.wait_for_function(
                "() => document.querySelectorAll('.hub-library-card').length === 2",
                timeout=2000)
            p5 = await page.evaluate("""() => ({
                cardCount: document.querySelectorAll('.hub-library-card').length
            })""")
            expect("P5: x auf 1 Card -> 1 weg, 2 bleiben",
                   p5["cardCount"] == 2, str(p5))

            # ─── P6: "Alles loeschen" -> alle weg ──────────────────────────
            page.on("dialog", lambda d: d.accept())
            await page.click("#hubLibraryClear")
            await page.wait_for_function(
                "() => !document.getElementById('hubLibrary').classList.contains('has-files')",
                timeout=2000)
            p6 = await page.evaluate("""async () => ({
                libraryHidden: !document.getElementById('hubLibrary').classList.contains('has-files'),
                mappeCount: (await Mappe.listFiles({})).length
            })""")
            expect("P6: 'Alles loeschen' bestaetigt -> alle weg",
                   p6["libraryHidden"] and p6["mappeCount"] == 0, str(p6))

            await browser.close()
    finally:
        httpd.shutdown()
        httpd.server_close()

    print()
    print(f"  -- {len(passed)} passed, {len(failed)} failed --")
    if failed:
        print()
        for label, detail in failed:
            print(f"  ! {label}: {detail}")
        return 1
    return 0


if __name__ == "__main__":
    code = asyncio.run(run_tests())
    sys.exit(code)
