import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { handlePlanRequest, getStatus } = require("./server/concierge-core.cjs");

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const PORT = Number(process.env.PORT || 8794);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".pdf": "application/pdf"
};

async function loadLocalEnv() {
  for (const name of [".env.local", ".env"]) {
    try {
      const raw = await fs.readFile(path.join(ROOT, name), "utf8");
      raw.split(/\r?\n/).forEach((line) => {
        const clean = line.trim();
        if (!clean || clean.startsWith("#")) return;
        const eq = clean.indexOf("=");
        if (eq < 1) return;
        const key = clean.slice(0, eq).trim();
        let value = clean.slice(eq + 1).trim();
        value = value.replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) process.env[key] = value;
      });
    } catch {
      // optional
    }
  }
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, { "content-type": "application/json; charset=utf-8" }, JSON.stringify(data));
}

function readRequestBody(req, max = 24 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > max) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function resolveFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  let pathname = decoded === "/" ? "/index.html" : decoded;
  if (pathname.endsWith("/")) pathname += "index.html";
  if (!path.extname(pathname)) pathname += "/index.html";
  const absolute = path.resolve(ROOT, "." + pathname);
  if (!absolute.startsWith(ROOT)) return null;
  return absolute;
}

async function serveStatic(req, res, pathname) {
  const absolute = resolveFilePath(pathname);
  if (!absolute) {
    send(res, 403, { "content-type": "text/plain; charset=utf-8" }, "Forbidden");
    return;
  }
  try {
    const data = await fs.readFile(absolute);
    const ext = path.extname(absolute).toLowerCase();
    send(res, 200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=3600"
    }, data);
  } catch {
    send(res, 404, { "content-type": "text/plain; charset=utf-8" }, "Not found");
  }
}

await loadLocalEnv();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `127.0.0.1:${PORT}`}`);

  if (req.method === "GET" && url.pathname === "/api/concierge/status") {
    sendJson(res, 200, getStatus(process.env));
    return;
  }

  if (url.pathname === "/api/concierge/plan") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: { message: "Method not allowed" } });
      return;
    }
    try {
      const raw = await readRequestBody(req);
      const out = await handlePlanRequest(raw, req.headers, process.env);
      send(res, out.status, out.headers, out.body);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: { message: err.message || "Bad request" } });
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { ok: false, error: { message: "Method not allowed" } });
    return;
  }

  await serveStatic(req, res, url.pathname);
});

server.listen(PORT, "127.0.0.1", () => {
  const status = getStatus(process.env);
  console.log(`[tools] http://127.0.0.1:${PORT}/`);
  console.log(`[tools] Concierge: ${status.keyConfigured ? status.model : "local fallback - GEMINI_API_KEY missing"}`);
});
