"""
test-converters.py -- Verify DOCX->PDF + PDF->Word quality
========================================================

Smoke + Quality-Tests fuer beide Konverter mit echten Files.

Run: python scripts/test-converters.py
"""
import asyncio
import http.server
import socketserver
import threading
import functools
import os
import sys
import time
import base64
import shutil
import tempfile
from pathlib import Path

PORT = 8770
ROOT = Path(__file__).resolve().parent.parent

TEST_DOCX = Path("C:/Apps/clawbuis-demo-store/scripts/test-4page.docx")
TEST_PDF = Path("C:/Apps/2026/Aufstocken/PDF_Bericht/Option-A-Kniestock.pdf")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def start_server(root):
    handler = functools.partial(QuietHandler, directory=str(root))
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    httpd.allow_reuse_address = True
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


async def run_tests():
    from playwright.async_api import async_playwright

    if not TEST_DOCX.exists():
        print(f"  SKIP: {TEST_DOCX} not found")
        return 1
    if not TEST_PDF.exists():
        print(f"  SKIP: {TEST_PDF} not found")
        return 1

    # Copy test files into temp serving dir so playwright can pick them up via file-input
    tmp = tempfile.mkdtemp(prefix="clawtools-test-")
    docx_copy = Path(tmp) / TEST_DOCX.name
    pdf_copy = Path(tmp) / TEST_PDF.name
    shutil.copy(TEST_DOCX, docx_copy)
    shutil.copy(TEST_PDF, pdf_copy)

    httpd = start_server(ROOT)
    time.sleep(0.4)
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
            context = await browser.new_context(viewport={'width': 1280, 'height': 900},
                                                service_workers='block')
            page = await context.new_page()
            errs = []
            page.on("pageerror", lambda exc: errs.append(str(exc)))
            page.on("console", lambda m: errs.append(f"[err] {m.text}") if m.type == "error" else None)

            # ─── docx-zu-pdf ────────────────────────────────────────────────
            await page.goto(f"http://127.0.0.1:{PORT}/docx-zu-pdf/", wait_until="load")
            await page.wait_for_function("() => typeof pdfMake !== 'undefined'", timeout=20000)

            # Set file via input
            await page.set_input_files("#fileInput", str(docx_copy))
            await page.wait_for_function(
                "() => document.getElementById('btnProcess')?.disabled === false",
                timeout=10000)
            stats = await page.evaluate("""() => ({
                wordCount: document.getElementById('statWords')?.textContent,
                imgCount: document.getElementById('statImages')?.textContent,
                tableCount: document.getElementById('statTables')?.textContent,
                fileName: document.getElementById('fileName')?.textContent
            })""")
            expect("docx: file loaded + stats populated",
                   stats["fileName"] == "test-4page.docx" and stats["wordCount"] != "--",
                   str(stats))

            # Click "Als PDF speichern" -> wait for result
            await page.click("#btnProcess")
            await page.wait_for_selector("#result.active", timeout=15000)
            result_info = await page.evaluate("() => document.getElementById('resultInfo')?.textContent")
            print(f"  [docx->pdf] result: {result_info}")
            expect("docx: result-info mentions 'echter Text'",
                   "echter Text" in result_info, result_info)

            # Capture the download by clicking btnDownload
            async with page.expect_download(timeout=10000) as dl_info:
                await page.click("#btnDownload")
            docx_pdf_download = await dl_info.value
            out_pdf = Path(tmp) / "docx-output.pdf"
            await docx_pdf_download.save_as(str(out_pdf))
            pdf_bytes = out_pdf.read_bytes()
            blob_size = len(pdf_bytes)
            print(f"  [saved] {out_pdf} ({blob_size} bytes)")

            expect("docx: outBlob has content (>1 KB)",
                   blob_size > 1024, f"size={blob_size}")
            expect("docx: file size sane (vector PDF should be < 500 KB for 4-page text)",
                   blob_size < 500 * 1024,
                   f"{blob_size} bytes")
            expect("docx: blob has %PDF magic header",
                   pdf_bytes[:4] == b"%PDF",
                   pdf_bytes[:8].hex())
            pdf_str = pdf_bytes.decode('latin1', errors='replace')
            has_flate = '/FlateDecode' in pdf_str
            expect("docx: PDF has compressed streams (FlateDecode)",
                   has_flate, "no FlateDecode")
            # /Subtype /Image marks true image-XObjects (html2canvas-PDFs have one per slice).
            # Procset entries like /ImageC are standard and don't count.
            import re
            real_images = len(re.findall(rb'/Subtype\s*/Image', pdf_bytes))
            expect("docx: PDF is vector (no embedded JPEG slices via /Subtype /Image)",
                   real_images == 0,
                   f"found {real_images} embedded image objects")

            # ─── pdf-to-word ────────────────────────────────────────────────
            await page.goto(f"http://127.0.0.1:{PORT}/pdf-to-word/", wait_until="networkidle")
            await page.wait_for_function("() => typeof pdfjsLib !== 'undefined'", timeout=10000)

            await page.set_input_files("#fileInput", str(pdf_copy))
            await page.wait_for_function(
                "() => document.getElementById('btnExport')?.disabled === false",
                timeout=15000)

            pdf_stats = await page.evaluate("""() => ({
                pages: document.getElementById('statPages')?.textContent,
                chars: document.getElementById('statChars')?.textContent,
                previewPageCount: document.querySelectorAll('.preview-page').length,
                firstHeadingText: document.querySelector('.preview-page .heading-1')?.textContent?.slice(0, 60),
                firstParaText: document.querySelector('.preview-page p')?.textContent?.slice(0, 80)
            })""")
            print(f"  [pdf->word] stats: {pdf_stats}")
            expect("pdf: stats populated (pages + chars)",
                   pdf_stats["pages"] not in (None, "--") and pdf_stats["chars"] not in (None, "--"),
                   str(pdf_stats))
            expect("pdf: preview pages rendered",
                   pdf_stats["previewPageCount"] >= 1, str(pdf_stats))
            expect("pdf: paragraph text extracted",
                   pdf_stats["firstParaText"] is not None and len(pdf_stats["firstParaText"]) > 5,
                   str(pdf_stats))

            # Click export -> DOCX
            await page.click("input[name='format'][value='docx']")
            # Set up download listener
            async with page.expect_download(timeout=15000) as dl_info:
                await page.click("#btnExport")
            download = await dl_info.value
            download_path = Path(tmp) / download.suggested_filename
            await download.save_as(str(download_path))
            print(f"  [saved] {download_path} ({download_path.stat().st_size} bytes)")
            expect("pdf: DOCX export succeeded",
                   download_path.exists() and download_path.stat().st_size > 1024,
                   str(download_path.stat().st_size if download_path.exists() else "missing"))

            # Verify DOCX has expected structure -- quick zip+xml inspection
            import zipfile
            with zipfile.ZipFile(str(download_path)) as zf:
                names = zf.namelist()
                has_doc = "word/document.xml" in names
                expect("pdf: DOCX has word/document.xml",
                       has_doc, str(names[:5]))
                if has_doc:
                    doc_xml = zf.read("word/document.xml").decode('utf-8', errors='replace')
                    expect("pdf: DOCX has paragraph runs (<w:p>)",
                           "<w:p" in doc_xml, "")
                    has_bold = '<w:b/>' in doc_xml or '<w:b ' in doc_xml
                    has_italic = '<w:i/>' in doc_xml or '<w:i ' in doc_xml
                    has_heading = '<w:pStyle w:val="Heading' in doc_xml
                    print(f"  [pdf->word] DOCX has: bold={has_bold}, italic={has_italic}, headings={has_heading}")

            await browser.close()
    finally:
        httpd.shutdown()
        httpd.server_close()
        print(f"  [tmp dir] {tmp} (kept for inspection)")

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
