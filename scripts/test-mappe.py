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

            # ─── Test 13e: Hub v2 library hidden when empty ───
            await page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
            await page.wait_for_function("() => window.Mappe && window.Mappe.UI", timeout=5000)
            await page.evaluate("() => Mappe.clearAll()")
            # Give panel render a tick
            await page.wait_for_timeout(200)
            panel_empty = await page.evaluate("""() => ({
                visible: document.getElementById('hubLibrary').classList.contains('has-files'),
                hasConcierge: !!document.getElementById('hubConcierge'),
                overflowX: document.documentElement.scrollWidth - window.innerWidth
            })""")
            expect("Hub v2 library hidden when empty", panel_empty["visible"] is False, str(panel_empty))
            expect("Hub v2 concierge visible", panel_empty["hasConcierge"] is True, str(panel_empty))
            expect("Hub v2 no horizontal overflow empty", panel_empty["overflowX"] <= 1, str(panel_empty))

            # ─── Test 13f: Hub v2 library visible after addFile ───
            await page.evaluate("""async () => {
                const blob = new Blob(['hub panel test'], { type: 'application/pdf' });
                const file = new File([blob], 'panel-test.pdf', { type: 'application/pdf' });
                await Mappe.addFile(file, 'hub');
            }""")
            await page.wait_for_function(
                "() => document.getElementById('hubLibrary').classList.contains('has-files')",
                timeout=2000)
            panel_visible = await page.evaluate("""() => ({
                visible: document.getElementById('hubLibrary').classList.contains('has-files'),
                summary: document.getElementById('hubLibraryCount').textContent,
                cardCount: document.querySelectorAll('.mg-group').length,
                firstCardName: document.querySelector('.mg-group-title')?.textContent,
                counter: document.querySelector('a[href="/pdf-merger"] .hub-tile-counter')?.textContent || '',
                ids: document.querySelector('a[href="/pdf-merger"]')?.getAttribute('data-mappe-ids') || ''
            })""")
            expect("Hub v2 library visible after add", panel_visible["visible"] is True, str(panel_visible))
            expect("Hub v2 library count correct", panel_visible["summary"] == "1", str(panel_visible))
            expect("Hub v2 grouped card rendered", panel_visible["cardCount"] >= 1, str(panel_visible))
            expect("Hub v2 PDF counter rendered", "1 aus Mappe" in panel_visible["counter"], str(panel_visible))
            expect("Hub v2 PDF ids set", len(panel_visible["ids"]) > 0, str(panel_visible))

            idle_workflow = await page.evaluate("""() => ({
                stepCount: document.querySelectorAll('.hub-workflow-step').length,
                startVisible: !!document.querySelector('.hub-workflow-start'),
                idleText: document.querySelector('.hub-concierge-empty')?.textContent || '',
                buildDisabled: document.getElementById('hubIntentBuild')?.disabled === true
            })""")
            expect("Hub Workflow bleibt ohne Eingabe idle",
                   idle_workflow["stepCount"] == 0 and idle_workflow["startVisible"] is False,
                   str(idle_workflow))
            expect("Hub Workflow zeigt Wunsch-Hinweis statt Vorschlag",
                   "Wunsch" in idle_workflow["idleText"] and idle_workflow["buildDisabled"] is True,
                   str(idle_workflow))

            # ─── Test 13g: Hub v2 concierge ranks intent ───
            await page.evaluate("() => document.getElementById('hubConcierge')?.classList.remove('is-collapsed')")
            await page.fill("#hubIntentInput", "Ich will das PDF unterschreiben")
            await page.wait_for_timeout(150)
            concierge = await page.evaluate("""() => ({
                firstTool: document.querySelector('.hub-concierge-result')?.getAttribute('data-tool'),
                firstText: document.querySelector('.hub-concierge-result')?.textContent || '',
                resultCount: document.querySelectorAll('.hub-concierge-result').length,
                chatBubbles: document.querySelectorAll('.hub-chat-thread-result .hub-chat-message').length
            })""")
            expect("Hub v2 concierge ranks sign tool", concierge["firstTool"] == "pdf-sign", str(concierge))
            expect("Hub v2 concierge renders results", concierge["resultCount"] >= 1, str(concierge))
            expect("Hub v2 concierge rendert Chat-Antwort nach Eingabe", concierge["chatBubbles"] == 2, str(concierge))

            # ─── Test 13g.2: Workflow-Builder erkennt Synonyme + Multi-Step ───
            ocr_flow = await page.evaluate("""async () => (
                await window.__CLAWBUIS_TOOLS_QA__.buildWorkflowForIntent('das muss ich dann noch auslesen')
            )""")
            expect("Workflow-Builder erkennt 'auslesen' als OCR",
                   ocr_flow["topTool"] == "pdf-ocr",
                   str(ocr_flow))

            compress_flow = await page.evaluate("""async () => (
                await window.__CLAWBUIS_TOOLS_QA__.buildWorkflowForIntent('ich moechte das noch runter machen')
            )""")
            expect("Workflow-Builder erkennt 'runter machen' als komprimieren",
                   compress_flow["topTool"] == "pdf-compress",
                   str(compress_flow))

            multi_flow = await page.evaluate("""async () => (
                await window.__CLAWBUIS_TOOLS_QA__.buildWorkflowForIntent('erst unterschreiben, dann auslesen und danach kleiner fuer email machen')
            )""")
            expect("Workflow-Builder baut Multi-Step Workflow",
                   multi_flow["stepTools"][:3] == ["pdf-sign", "pdf-ocr", "pdf-compress"],
                   str(multi_flow))

            await page.click(".hub-workflow-step[data-tool='pdf-ocr'] .hub-workflow-step-control[aria-label='Entfernen']")
            edited_flow = await page.evaluate("""() => ({
                stepTools: Array.from(document.querySelectorAll('.hub-workflow-step')).map(el => el.getAttribute('data-tool')),
                startTool: document.querySelector('.hub-workflow-start')?.getAttribute('data-tool')
            })""")
            expect("Workflow-Builder erlaubt Schritt entfernen",
                   edited_flow["stepTools"] == ["pdf-sign", "pdf-compress"] and edited_flow["startTool"] == "pdf-sign",
                   str(edited_flow))

            no_file_family_flow = await page.evaluate("""async () => {
                await Mappe.clearAll();
                const imageFlow = await window.__CLAWBUIS_TOOLS_QA__.buildWorkflowForIntent('bilder runter machen');
                const videoFlow = await window.__CLAWBUIS_TOOLS_QA__.buildWorkflowForIntent('video runter machen');
                return { imageFlow, videoFlow };
            }""")
            expect("Workflow-Builder trennt Bild-Intent von PDF-Kompression",
                   no_file_family_flow["imageFlow"]["topTool"] == "images-compress",
                   str(no_file_family_flow))
            expect("Workflow-Builder trennt Video-Intent von PDF-Kompression",
                   no_file_family_flow["videoFlow"]["topTool"] == "video-compress",
                   str(no_file_family_flow))

            implicit_pdf_flow = await page.evaluate("""async () => (
                await window.__CLAWBUIS_TOOLS_QA__.buildWorkflowForIntent('das auslesen und runter machen')
            )""")
            expect("Workflow-Builder erkennt impliziten PDF-Intent aus OCR + runter",
                   implicit_pdf_flow["stepTools"][:2] == ["pdf-ocr", "pdf-compress"] and "images-compress" not in implicit_pdf_flow["stepTools"],
                   str(implicit_pdf_flow))

            workflow_runner_flow = await page.evaluate("""async () => {
                await Mappe.clearAll();
                const pdfBytes = new Uint8Array([37,80,68,70,45,49,46,55,10,37,10]);
                const originalId = await Mappe.addFile(new File([pdfBytes], 'vertrag.pdf', { type: 'application/pdf' }), 'qa');
                sessionStorage.setItem('clawbuis-active-workflow', JSON.stringify({
                  id: 'wf_qa_runner',
                  status: 'running',
                  currentStepIndex: 0,
                  steps: [
                    { id: 's1', tool: 'pdf-sign', label: 'PDF signieren', status: 'ready', fileIds: [originalId] },
                    { id: 's2', tool: 'pdf-ocr', label: 'PDF auslesen', status: 'draft', fileIds: [originalId] },
                    { id: 's3', tool: 'pdf-compress', label: 'PDF kleiner machen', status: 'draft', fileIds: [originalId] }
                  ]
                }));
                const host = document.createElement('div');
                document.body.appendChild(host);
                const savedId = await Shell.showWorkflowNextSteps({
                  blob: new Blob([pdfBytes], { type: 'application/pdf' }),
                  filename: 'vertrag_signiert.pdf',
                  type: 'application/pdf',
                  sourceTool: 'pdf-sign',
                  container: host,
                  preferredTools: ['pdf-redact', 'pdf-compress']
                });
                const plan = JSON.parse(sessionStorage.getItem('clawbuis-active-workflow'));
                const primary = host.querySelector('.workflow-next-action.primary');
                return {
                  savedId,
                  title: host.querySelector('.workflow-next-copy strong')?.textContent || '',
                  href: primary?.getAttribute('href') || '',
                  currentStepIndex: plan.currentStepIndex,
                  statuses: plan.steps.map(step => step.status),
                  nextFileIds: plan.steps[1].fileIds,
                  actionText: primary?.textContent || ''
                };
            }""")
            expect("Workflow-Runner zeigt geplanten naechsten Schritt statt Standardvorschlag",
                   "Workflow-Schritt" in workflow_runner_flow["title"] and "/pdf-ocr/?from=mappe&ids=" in workflow_runner_flow["href"],
                   str(workflow_runner_flow))
            expect("Workflow-Runner uebergibt Ergebnisdatei an naechsten Schritt",
                   workflow_runner_flow["nextFileIds"] == [workflow_runner_flow["savedId"]] and workflow_runner_flow["currentStepIndex"] == 1,
                   str(workflow_runner_flow))

            workflow_fallback_flow = await page.evaluate("""async () => {
                await Mappe.clearAll();
                const pdfBytes = new Uint8Array([37,80,68,70,45,49,46,55,10,37,10]);
                const originalId = await Mappe.addFile(new File([pdfBytes], 'scan.pdf', { type: 'application/pdf' }), 'qa');
                sessionStorage.setItem('clawbuis-active-workflow', JSON.stringify({
                  id: 'wf_qa_fallback',
                  status: 'running',
                  currentStepIndex: 0,
                  steps: [
                    { id: 's1', tool: 'pdf-ocr', label: 'PDF auslesen', status: 'ready', fileIds: [originalId] },
                    { id: 's2', tool: 'pdf-compress', label: 'PDF kleiner machen', status: 'draft', fileIds: [originalId] }
                  ]
                }));
                const host = document.createElement('div');
                document.body.appendChild(host);
                const textId = await Shell.showWorkflowNextSteps({
                  blob: new Blob(['erkannter text'], { type: 'text/plain' }),
                  filename: 'scan_text.txt',
                  type: 'text/plain',
                  sourceTool: 'pdf-ocr',
                  container: host,
                  inputFileIds: [originalId]
                });
                const plan = JSON.parse(sessionStorage.getItem('clawbuis-active-workflow'));
                const primary = host.querySelector('.workflow-next-action.primary');
                sessionStorage.removeItem('clawbuis-active-workflow');
                return {
                  originalId,
                  textId,
                  href: primary?.getAttribute('href') || '',
                  nextFileIds: plan.steps[1].fileIds,
                  sub: primary?.querySelector('.workflow-next-action-sub')?.textContent || ''
                };
            }""")
            expect("Workflow-Runner nutzt Originaldatei wenn Ergebnisformat nicht passt",
                   workflow_fallback_flow["nextFileIds"] == [workflow_fallback_flow["originalId"]] and
                   f"/pdf-compress/?from=mappe&ids={workflow_fallback_flow['originalId']}" in workflow_fallback_flow["href"],
                   str(workflow_fallback_flow))

            workflow_manual_flow = await page.evaluate("""async () => {
                sessionStorage.setItem('clawbuis-active-workflow', JSON.stringify({
                  id: 'wf_qa_manual',
                  status: 'running',
                  currentStepIndex: 0,
                  steps: [
                    { id: 's1', tool: 'pdf-redact', label: 'PDF schwaerzen', status: 'ready', fileIds: [] },
                    { id: 's2', tool: 'pdf-sign', label: 'PDF signieren', status: 'draft', fileIds: [] }
                  ]
                }));
                const host = document.createElement('div');
                document.body.appendChild(host);
                await Shell.showWorkflowNextSteps({
                  sourceTool: 'pdf-redact',
                  container: host
                });
                const plan = JSON.parse(sessionStorage.getItem('clawbuis-active-workflow'));
                const primary = host.querySelector('.workflow-next-action.primary');
                sessionStorage.removeItem('clawbuis-active-workflow');
                return {
                  href: primary?.getAttribute('href') || '',
                  className: primary?.className || '',
                  nextFileIds: plan.steps[1].fileIds,
                  currentStepIndex: plan.currentStepIndex
                };
            }""")
            expect("Workflow-Runner kann naechsten Schritt ohne Auto-Datei manuell oeffnen",
                   workflow_manual_flow["href"].endswith("/pdf-sign/") and
                   "manual" in workflow_manual_flow["className"] and
                   workflow_manual_flow["nextFileIds"] == [] and
                   workflow_manual_flow["currentStepIndex"] == 1,
                   str(workflow_manual_flow))

            # ─── Test 13h: Concierge → pdf-sign → real editor load ───
            await page.evaluate("""async () => {
                await Mappe.clearAll();
                function makePdfBytes() {
                  const enc = new TextEncoder();
                  const stream = 'BT /F1 18 Tf 40 180 Td (CLAWBUIS Signatur-Test) Tj ET';
                  const objs = [
                    '1 0 obj\\n<< /Type /Catalog /Pages 2 0 R >>\\nendobj\\n',
                    '2 0 obj\\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\\nendobj\\n',
                    '3 0 obj\\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 320 240] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\\nendobj\\n',
                    '4 0 obj\\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\\nendobj\\n',
                    `5 0 obj\\n<< /Length ${enc.encode(stream).length} >>\\nstream\\n${stream}\\nendstream\\nendobj\\n`
                  ];
                  let pdf = '%PDF-1.4\\n';
                  const offsets = [];
                  for (const obj of objs) {
                    offsets.push(enc.encode(pdf).length);
                    pdf += obj;
                  }
                  const xrefOffset = enc.encode(pdf).length;
                  pdf += `xref\\n0 ${objs.length + 1}\\n0000000000 65535 f \\n`;
                  pdf += offsets.map(n => `${String(n).padStart(10, '0')} 00000 n \\n`).join('');
                  pdf += `trailer\\n<< /Size ${objs.length + 1} /Root 1 0 R >>\\nstartxref\\n${xrefOffset}\\n%%EOF\\n`;
                  return enc.encode(pdf);
                }
                const file = new File([makePdfBytes()], 'vertrag-signaturtest.pdf', { type: 'application/pdf' });
                await Mappe.addFile(file, 'hub');
            }""")
            await page.wait_for_function(
                "() => document.getElementById('hubLibrary').classList.contains('has-files')",
                timeout=2000)
            await page.evaluate("() => document.getElementById('hubConcierge')?.classList.remove('is-collapsed')")
            await page.fill("#hubIntentInput", "unterschreiben")
            await page.wait_for_timeout(150)
            await page.click('.hub-concierge-result[data-tool="pdf-sign"]')
            await page.wait_for_url("**/pdf-sign/**from=mappe**", timeout=4000)
            await page.wait_for_function(
                "() => document.getElementById('editorView') && getComputedStyle(document.getElementById('editorView')).display !== 'none'",
                timeout=6000)
            sign_flow = await page.evaluate("""() => ({
                fileName: document.getElementById('fileName')?.textContent || '',
                pageCanvases: document.querySelectorAll('.page-canvas').length,
                pickerVisible: !!document.querySelector('.mappe-picker-backdrop'),
                overflowX: document.documentElement.scrollWidth - window.innerWidth
            })""")
            expect("Hub v2 concierge opens pdf-sign with Mappe PDF",
                   sign_flow["fileName"] == "vertrag-signaturtest.pdf" and sign_flow["pageCanvases"] == 1,
                   str(sign_flow))
            expect("Hub v2 pdf-sign single-file flow needs no picker",
                   sign_flow["pickerVisible"] is False,
                   str(sign_flow))
            expect("Hub v2 pdf-sign flow has no horizontal overflow",
                   sign_flow["overflowX"] <= 1,
                   str(sign_flow))

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
