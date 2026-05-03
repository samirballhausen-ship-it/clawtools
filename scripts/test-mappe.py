"""
Headless-Test fuer shared/mappe.js + shared/mappe-ui.js
========================================================
Phase 1 Foundation-Test: addFile -> listFiles -> getFile -> deleteFile -> clearAll.

Run:  python scripts/test-mappe.py
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

PORT = 8765
ROOT = Path(__file__).resolve().parent.parent  # projects/tools


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # silence


def start_server():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    httpd.allow_reuse_address = True
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


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
            context = await browser.new_context()
            page = await context.new_page()

            page.on("console", lambda msg: print(f"  [console.{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
            page.on("pageerror", lambda exc: print(f"  [pageerror] {exc}"))

            await page.goto(f"http://127.0.0.1:{PORT}/scripts/test-harness.html", wait_until="networkidle")

            # ─── Test 1: Mappe API exists ───
            api_check = await page.evaluate("""() => {
                return {
                  hasMappe: typeof window.Mappe === 'object',
                  hasAdd: typeof window.Mappe.addFile === 'function',
                  hasList: typeof window.Mappe.listFiles === 'function',
                  hasGet: typeof window.Mappe.getFile === 'function',
                  hasDelete: typeof window.Mappe.deleteFile === 'function',
                  hasClear: typeof window.Mappe.clearAll === 'function',
                  hasQuota: typeof window.Mappe.getQuota === 'function',
                  hasOnChange: typeof window.Mappe.onChange === 'function'
                };
            }""")
            expect("Mappe API loaded", all(api_check.values()), str(api_check))

            # ─── Test 2: clearAll on fresh DB ───
            cleared = await page.evaluate("() => Mappe.clearAll()")
            expect("clearAll on fresh DB returns 0", cleared == 0, f"got {cleared}")

            # ─── Test 3: addFile + listFiles ───
            add_result = await page.evaluate("""async () => {
                const blob1 = new Blob(['Hello PDF'], { type: 'application/pdf' });
                const file1 = new File([blob1], 'test1.pdf', { type: 'application/pdf' });
                const id1 = await Mappe.addFile(file1, 'test-harness');

                const blob2 = new Blob([new Uint8Array(2048)], { type: 'image/png' });
                const file2 = new File([blob2], 'test2.png', { type: 'image/png' });
                const id2 = await Mappe.addFile(file2, 'test-harness');

                const list = await Mappe.listFiles({});
                return { id1, id2, listLength: list.length, names: list.map(f => f.name).sort() };
            }""")
            expect("addFile returns numeric IDs",
                   isinstance(add_result["id1"], int) and isinstance(add_result["id2"], int),
                   str(add_result))
            expect("listFiles returns 2 files after 2 adds",
                   add_result["listLength"] == 2,
                   f"got {add_result['listLength']}")
            expect("listFiles names match",
                   add_result["names"] == ["test1.pdf", "test2.png"],
                   str(add_result["names"]))

            # ─── Test 4: type-filter ───
            filter_result = await page.evaluate("""async () => {
                const pdfs = await Mappe.listFiles({ types: ['application/pdf'] });
                const images = await Mappe.listFiles({ types: ['image/*'] });
                const both = await Mappe.listFiles({ types: ['application/pdf', 'image/*'] });
                return { pdfs: pdfs.length, images: images.length, both: both.length };
            }""")
            expect("type-filter pdf -> 1", filter_result["pdfs"] == 1, str(filter_result))
            expect("type-filter image/* -> 1", filter_result["images"] == 1, str(filter_result))
            expect("type-filter combined -> 2", filter_result["both"] == 2, str(filter_result))

            # ─── Test 5: getFile returns blob ───
            get_result = await page.evaluate("""async () => {
                const list = await Mappe.listFiles({});
                const first = list[0];
                const rec = await Mappe.getFile(first.id);
                return {
                  hasBlob: rec && rec.blob && typeof rec.blob.arrayBuffer === 'function',
                  name: rec ? rec.name : null,
                  size: rec ? rec.size : null
                };
            }""")
            expect("getFile returns record with blob",
                   get_result["hasBlob"] is True,
                   str(get_result))

            # ─── Test 6: getFile(invalid) returns null ───
            null_result = await page.evaluate("() => Mappe.getFile(999999)")
            expect("getFile(invalid) returns null", null_result is None, f"got {null_result}")

            # ─── Test 7: deleteFile + listFiles ───
            del_result = await page.evaluate("""async () => {
                const list = await Mappe.listFiles({});
                const ok = await Mappe.deleteFile(list[0].id);
                const after = await Mappe.listFiles({});
                return { ok, afterLength: after.length };
            }""")
            expect("deleteFile returns true", del_result["ok"] is True, str(del_result))
            expect("listFiles after delete -> 1", del_result["afterLength"] == 1, str(del_result))

            # ─── Test 8: deleteFile(invalid) returns false ───
            invalid_del = await page.evaluate("() => Mappe.deleteFile(999999)")
            expect("deleteFile(invalid) returns false", invalid_del is False, f"got {invalid_del}")

            # ─── Test 9: getQuota structure ───
            quota = await page.evaluate("() => Mappe.getQuota()")
            expect("getQuota has keys",
                   all(k in quota for k in ("used", "total", "percent", "fileCount", "softLimit")),
                   str(quota))
            expect("getQuota fileCount matches", quota["fileCount"] == 1, str(quota))

            # ─── Test 10: onChange listener fires ───
            listener_result = await page.evaluate("""async () => {
                const events = [];
                const unsub = Mappe.onChange((evt) => events.push(evt));
                const blob = new Blob(['x'], { type: 'text/plain' });
                const file = new File([blob], 'listener-test.txt', { type: 'text/plain' });
                await Mappe.addFile(file, 'test');
                await new Promise(r => setTimeout(r, 50));
                unsub();
                // After unsub, more adds should NOT fire
                const blob2 = new Blob(['y'], { type: 'text/plain' });
                await Mappe.addFile(new File([blob2], 'after.txt'), 'test');
                await new Promise(r => setTimeout(r, 50));
                return { events: events.map(e => e.type), eventCount: events.length };
            }""")
            expect("onChange fires once on addFile",
                   listener_result["eventCount"] == 1 and listener_result["events"][0] == "add",
                   str(listener_result))

            # ─── Test 11: clearAll wipes everything ───
            clear_result = await page.evaluate("""async () => {
                const before = (await Mappe.listFiles({})).length;
                const cleared = await Mappe.clearAll();
                const after = (await Mappe.listFiles({})).length;
                return { before, cleared, after };
            }""")
            expect("clearAll returns count", clear_result["cleared"] == clear_result["before"], str(clear_result))
            expect("clearAll empties store", clear_result["after"] == 0, str(clear_result))

            # ─── Test 12: Mappe.UI exists ───
            ui_check = await page.evaluate("""() => ({
                hasUI: typeof Mappe.UI === 'object',
                hasInjectHeader: typeof Mappe.UI.injectHeaderIcon === 'function',
                hasOpenModal: typeof Mappe.UI.openModal === 'function',
                hasInjectDropzoneAlt: typeof Mappe.UI.injectDropzoneAlternative === 'function'
            })""")
            expect("Mappe.UI is exposed", all(ui_check.values()), str(ui_check))

            # ─── Test 13a: Header-Integration via Hub (index.html) ───
            #    Verify shell.js auto-loads Mappe-Scripts and injects Header-Icon.
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            # Wait briefly for dynamic Mappe load
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.wait_for_selector(".mappe-trigger", timeout=3000)

            header_check = await page.evaluate("""() => ({
                hasTrigger: !!document.querySelector('.mappe-trigger'),
                hasBadge: !!document.querySelector('.mappe-trigger-badge'),
                badgeHidden: document.querySelector('.mappe-trigger-badge')?.classList.contains('hidden'),
                badgeText: document.querySelector('.mappe-trigger-badge')?.textContent
            })""")
            expect("Header trigger injected on Hub", header_check["hasTrigger"], str(header_check))
            expect("Header badge present", header_check["hasBadge"], str(header_check))
            expect("Badge hidden when 0 files", header_check["badgeHidden"] is True, str(header_check))

            # Add a file → badge should update live
            await page.evaluate("""async () => {
                const blob = new Blob(['hub test'], { type: 'application/pdf' });
                const file = new File([blob], 'hub-test.pdf', { type: 'application/pdf' });
                await Mappe.addFile(file, 'hub');
            }""")
            await page.wait_for_function(
                "() => !document.querySelector('.mappe-trigger-badge').classList.contains('hidden')",
                timeout=2000)
            badge_after = await page.evaluate("""() => ({
                hidden: document.querySelector('.mappe-trigger-badge').classList.contains('hidden'),
                text: document.querySelector('.mappe-trigger-badge').textContent
            })""")
            expect("Badge visible after addFile", badge_after["hidden"] is False, str(badge_after))
            expect("Badge text = '1' after 1 file", badge_after["text"] == "1", str(badge_after))

            # ─── Test 13b: Click trigger opens modal ───
            await page.click(".mappe-trigger")
            await page.wait_for_selector(".mappe-backdrop.show", timeout=2000)
            modal_check = await page.evaluate("""() => ({
                hasBackdrop: !!document.querySelector('.mappe-backdrop'),
                hasDialog: !!document.querySelector('.mappe-dialog'),
                hasFileCard: !!document.querySelector('.mappe-file-card'),
                hasFilters: !!document.querySelector('.mappe-pills'),
                fileCardName: document.querySelector('.mappe-name')?.textContent
            })""")
            expect("Modal opens on trigger click", modal_check["hasBackdrop"] and modal_check["hasDialog"], str(modal_check))
            expect("Modal shows filter pills (browse mode)", modal_check["hasFilters"], str(modal_check))
            expect("Modal shows added file", modal_check["hasFileCard"], str(modal_check))
            expect("File card name correct", modal_check["fileCardName"] == "hub-test.pdf", str(modal_check))

            # ─── Test 13c: Close modal via X button ───
            await page.click(".mappe-dialog-close")
            await page.wait_for_function(
                "() => !document.querySelector('.mappe-backdrop')",
                timeout=2000)
            closed = await page.evaluate("() => !document.querySelector('.mappe-backdrop')")
            expect("Modal closes via X", closed is True, "")

            # ─── Test 13d: ESC also closes ───
            await page.click(".mappe-trigger")
            await page.wait_for_selector(".mappe-backdrop.show", timeout=2000)
            await page.keyboard.press("Escape")
            await page.wait_for_function(
                "() => !document.querySelector('.mappe-backdrop')",
                timeout=2000)
            closed2 = await page.evaluate("() => !document.querySelector('.mappe-backdrop')")
            expect("Modal closes via ESC", closed2 is True, "")

            # Cleanup
            await page.evaluate("() => Mappe.clearAll()")

            # ─── Test 13e: Hub-Panel hidden when empty ───
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.evaluate("() => Mappe.clearAll()")
            # Give panel render a tick
            await page.wait_for_timeout(200)
            panel_empty = await page.evaluate("""() => ({
                visible: document.getElementById('hubMappePanel').classList.contains('has-files'),
                expanded: document.getElementById('hubMappePanel').classList.contains('expanded')
            })""")
            expect("Hub-Panel hidden when empty", panel_empty["visible"] is False, str(panel_empty))

            # ─── Test 13f: Hub-Panel visible after addFile ───
            await page.evaluate("""async () => {
                const blob = new Blob(['hub panel test'], { type: 'application/pdf' });
                const file = new File([blob], 'panel-test.pdf', { type: 'application/pdf' });
                await Mappe.addFile(file, 'hub');
            }""")
            await page.wait_for_function(
                "() => document.getElementById('hubMappePanel').classList.contains('has-files')",
                timeout=2000)
            panel_visible = await page.evaluate("""() => ({
                visible: document.getElementById('hubMappePanel').classList.contains('has-files'),
                summary: document.getElementById('hubMappeSummary').textContent,
                cardCount: document.querySelectorAll('.hub-mappe-card').length,
                firstCardName: document.querySelector('.hub-mappe-card-name')?.textContent
            })""")
            expect("Hub-Panel visible after add", panel_visible["visible"] is True, str(panel_visible))
            expect("Hub-Panel summary correct", "1 Datei" in panel_visible["summary"], str(panel_visible))
            expect("Hub-Panel card rendered", panel_visible["cardCount"] == 1, str(panel_visible))
            expect("Hub-Panel card name correct",
                   panel_visible["firstCardName"] == "panel-test.pdf",
                   str(panel_visible))

            # ─── Test 13g: Click Hub-Panel head → expand body ───
            await page.click("#hubMappeHead")
            await page.wait_for_function(
                "() => document.getElementById('hubMappePanel').classList.contains('expanded')",
                timeout=1500)
            expanded = await page.evaluate(
                "() => document.getElementById('hubMappePanel').classList.contains('expanded')")
            expect("Hub-Panel head click expands", expanded is True, "")

            # Cleanup
            await page.evaluate("() => Mappe.clearAll()")

            # ─── Phase 4 Smoke-Tests: Tool-Integration on a sampling of tools ───
            TOOL_SAMPLE = [
                ("pdf-merger", "application/pdf"),
                ("bg-remove", "image/png"),
                ("video-compress", "video/mp4"),
                ("docx-zu-pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                ("csv-edit", "text/csv"),
                ("exif-rename", "image/jpeg"),
                ("images-compress", "image/png"),
            ]

            # First seed mappe with one file of each type via Hub
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.evaluate("() => Mappe.clearAll()")

            await page.evaluate("""async (types) => {
                for (const t of types) {
                  const blob = new Blob(['x'], { type: t });
                  const ext = t.split('/')[1].split('.').pop().split(';')[0].slice(0, 4);
                  const file = new File([blob], `seed-${ext}.${ext}`, { type: t });
                  await Mappe.addFile(file, 'hub-seed');
                }
            }""", list({t for _, t in TOOL_SAMPLE}))

            for slug, mime in TOOL_SAMPLE:
                await page.goto(f"http://127.0.0.1:{PORT}/{slug}/", wait_until="networkidle")
                # Wait for Mappe-load + dropzone-alt
                try:
                    await page.wait_for_function(
                        "() => window.Mappe && window.Mappe.UI && document.querySelector('.dropzone-alt')",
                        timeout=4000)
                    has_alt = await page.evaluate("""() => {
                        const alt = document.querySelector('.dropzone-alt');
                        return {
                            present: !!alt,
                            visible: alt ? !alt.classList.contains('hidden') : false,
                            buttonText: alt?.querySelector('.dropzone-alt-btn')?.textContent || ''
                        };
                    }""")
                    expect(f"{slug}: dropzone-alt injected", has_alt["present"], str(has_alt))
                    expect(f"{slug}: dropzone-alt visible (matching files exist)",
                           has_alt["visible"],
                           str(has_alt))
                    expect(f"{slug}: button label correct",
                           "Aus Mappe wählen" in has_alt["buttonText"],
                           str(has_alt))
                except Exception as e:
                    failed.append((f"{slug}: smoke-test", str(e)))
                    print(f"  FAIL  {slug}: smoke-test  {e}")

            # Cleanup
            await page.evaluate("() => Mappe.clearAll()")

            # ─── Phase 5: Cross-Tool E2E ───────────────────────────────────────
            # Step 1: Hub seed PDF
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.evaluate("""async () => {
                await Mappe.clearAll();
                const blob = new Blob(['%PDF-1.4 cross-tool test'], { type: 'application/pdf' });
                const file = new File([blob], 'cross-tool.pdf', { type: 'application/pdf' });
                await Mappe.addFile(file, 'hub');
            }""")

            # Step 2: Navigate to pdf-merger
            await page.goto(f"http://127.0.0.1:{PORT}/pdf-merger/", wait_until="networkidle")
            await page.wait_for_selector(".dropzone-alt-btn", timeout=4000)

            # Step 3: Click „Aus Mappe wählen"
            await page.click(".dropzone-alt-btn")
            await page.wait_for_selector(".mappe-backdrop.show", timeout=2000)
            await page.wait_for_selector(".mappe-file-card", timeout=2000)

            # Step 4: Click „Wählen" in modal
            await page.click(".mappe-btn-primary")

            # Step 5: Wait for file to be added to tool's state — pdf-merger renders file-row
            await page.wait_for_function(
                "() => document.querySelectorAll('.file-row').length > 0 || document.querySelectorAll('.queue-row').length > 0",
                timeout=4000)
            # Modal close is async (220ms slide-out + remove)
            await page.wait_for_function(
                "() => !document.querySelector('.mappe-backdrop')",
                timeout=2000)
            cross_tool = await page.evaluate("""() => ({
                hasRow: document.querySelectorAll('.file-row').length > 0,
                fileName: document.querySelector('.file-name')?.textContent,
                modalClosed: !document.querySelector('.mappe-backdrop')
            })""")
            expect("Cross-tool: file picker opens & loads file into pdf-merger",
                   cross_tool["hasRow"] and cross_tool["fileName"] == "cross-tool.pdf",
                   str(cross_tool))
            expect("Cross-tool: modal closes after pick",
                   cross_tool["modalClosed"] is True,
                   str(cross_tool))

            # ─── Phase 5b: Persistence (reload page) ───
            await page.evaluate("() => Mappe.clearAll()")
            await page.evaluate("""async () => {
                const blob = new Blob(['persist test'], { type: 'application/pdf' });
                const file = new File([blob], 'persist.pdf', { type: 'application/pdf' });
                await Mappe.addFile(file, 'test');
            }""")
            await page.reload(wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            persist = await page.evaluate("""async () => {
                const list = await Mappe.listFiles({});
                return { count: list.length, name: list[0]?.name };
            }""")
            expect("Persistence: file survives reload",
                   persist["count"] == 1 and persist["name"] == "persist.pdf",
                   str(persist))

            # ─── Phase 5c: Cross-Tab via 2nd context (BroadcastChannel) ───
            # NOTE: BroadcastChannel works across same-origin same-context. For
            # 2 pages in the same browser context this fires reliably.
            page2 = await context.new_page()
            await page2.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page2.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)

            # In page1 add a file, page2 should see it
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.evaluate("() => Mappe.clearAll()")
            await page2.wait_for_function(
                "() => document.querySelector('.mappe-trigger-badge')?.classList.contains('hidden')",
                timeout=3000)

            # Now add in page1 → page2 badge should update
            await page.evaluate("""async () => {
                const blob = new Blob(['cross-tab'], { type: 'application/pdf' });
                const file = new File([blob], 'cross-tab.pdf', { type: 'application/pdf' });
                await Mappe.addFile(file, 'tab1');
            }""")
            await page2.wait_for_function(
                "() => !document.querySelector('.mappe-trigger-badge').classList.contains('hidden')",
                timeout=3000)
            cross_tab = await page2.evaluate("""() => ({
                hidden: document.querySelector('.mappe-trigger-badge').classList.contains('hidden'),
                text: document.querySelector('.mappe-trigger-badge').textContent
            })""")
            expect("Cross-tab BroadcastChannel: badge updates in tab 2",
                   cross_tab["hidden"] is False and cross_tab["text"] == "1",
                   str(cross_tab))

            await page2.close()

            # Cleanup
            await page.evaluate("() => Mappe.clearAll()")

            # ─── Phase 5d: Privacy footer mentions Mappe ───
            await page.goto(f"http://127.0.0.1:{PORT}/pdf-merger/", wait_until="networkidle")
            await page.wait_for_selector("details.privacy", timeout=2000)
            privacy_text = await page.evaluate(
                "() => document.querySelector('details.privacy')?.textContent || ''")
            expect("Privacy footer mentions Mappe",
                   "Mappe" in privacy_text and "IndexedDB" in privacy_text,
                   privacy_text[-100:] if privacy_text else "")

            # ─── Test 14: format helpers (back to test-harness for clean state) ───
            await page.goto(f"http://127.0.0.1:{PORT}/scripts/test-harness.html", wait_until="networkidle")
            fmt = await page.evaluate("""() => ({
                bytes_500: Mappe.formatBytes(500),
                bytes_1500: Mappe.formatBytes(1500),
                bytes_2_5MB: Mappe.formatBytes(2.5 * 1024 * 1024),
                kindPDF: Mappe.getKindIcon('application/pdf', 'doc.pdf'),
                kindImage: Mappe.getKindIcon('image/png', 'a.png'),
                kindUnknown: Mappe.getKindIcon('', 'random')
            })""")
            expect("formatBytes(500) = '500 B'", fmt["bytes_500"] == "500 B", str(fmt))
            expect("formatBytes(1500) ~ KB", "KB" in fmt["bytes_1500"], str(fmt))
            expect("formatBytes(2.5MB) ~ MB", "MB" in fmt["bytes_2_5MB"], str(fmt))
            expect("getKindIcon pdf", fmt["kindPDF"] == "pdf", str(fmt))
            expect("getKindIcon image", fmt["kindImage"] == "image", str(fmt))
            expect("getKindIcon unknown -> file", fmt["kindUnknown"] == "file", str(fmt))

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
