"use strict";

const { handlePlanRequest } = require("../../server/concierge-core.cjs");

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 24 * 1024) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: { message: "Method not allowed" } }));
    return;
  }
  try {
    const raw = await readBody(req);
    const out = await handlePlanRequest(raw, req.headers, process.env);
    res.statusCode = out.status;
    Object.entries(out.headers).forEach(([key, value]) => res.setHeader(key, value));
    res.end(out.body);
  } catch (err) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: { message: err.message || "Bad request" } }));
  }
};
