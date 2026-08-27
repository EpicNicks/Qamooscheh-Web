#!/usr/bin/env node
// Local-dev stand-in for docker/nginx/artifacts.conf in the backend repo:
// serves a course-artifacts directory directly at the origin root (no path
// prefix — a request for /course/fa/v2/manifest.json resolves to
// <dir>/course/fa/v2/manifest.json, exactly like nginx's `root /srv/artifacts`
// + `location ^/course/...`), with CORS enabled since the Vite dev server is
// a different origin. Api is never on this read path (API_SPEC.md §1) — this
// is purely a static file server.
//
// Usage: node scripts/serve-artifacts.mjs <path-to-Qamooscheh-repo>/artifacts [port]
// Matches VITE_CONTENT_BASE_URL in .env.local, which should be
// http://localhost:<port> — no /artifacts suffix, api/content.ts appends
// /course/{code}/v{version} itself.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [, , rootArg, portArg] = process.argv;

if (!rootArg) {
  console.error("Usage: node scripts/serve-artifacts.mjs <path-to-Qamooscheh-repo>/artifacts [port]");
  process.exit(1);
}

const root = path.resolve(rootArg);
const port = Number(portArg ?? 8080);

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Not a directory: ${root}`);
  process.exit(1);
}

const MIME = {
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const filePath = path.join(root, urlPath);

  // Never resolve outside root.
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.setHeader("Content-Type", MIME[path.extname(filePath)] ?? "application/octet-stream");
    res.writeHead(200).end(data);
  });
});

server.listen(port, () => console.log(`Serving ${root} at http://localhost:${port}`));
