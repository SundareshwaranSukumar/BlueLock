/**
 * Node.js HTTP adapter for the TanStack Start / Cloudflare Worker build.
 *
 * The Vite+@cloudflare/vite-plugin build emits a Worker-style module with a
 * default export of `{ fetch(request, env, ctx) }`. This script:
 *   1. Serves static assets from dist/client/ with long cache headers
 *   2. For all other requests, delegates to the Worker fetch handler which
 *      performs SSR (server-side rendering) via TanStack Start
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CLIENT_DIR = join(__dirname, "dist", "client");
const PORT = parseInt(process.env.PORT || "8080", 10);

// MIME type map for static assets
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

/**
 * Try to serve a file from dist/client.
 * Returns true if served, false if not found.
 */
async function tryServeStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Only serve files under /assets/ or known static files
  const filePath = join(CLIENT_DIR, pathname);

  // Security: prevent path traversal
  if (!filePath.startsWith(CLIENT_DIR)) return false;

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const body = await readFile(filePath);

    // Immutable cache for hashed assets
    const isHashed = pathname.startsWith("/assets/");
    const cacheControl = isHashed
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": body.length,
      "Cache-Control": cacheControl,
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert Node.js IncomingMessage to Web API Request
 */
function toWebRequest(req) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  return new Request(url.toString(), {
    method: req.method,
    headers,
    body: hasBody ? readStream(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

/**
 * Read a Node.js Readable stream into a ReadableStream
 */
function readStream(nodeStream) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(
          chunk instanceof Uint8Array ? chunk : Buffer.from(chunk)
        );
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
  });
}

/**
 * Send a Web API Response back to Node.js ServerResponse
 */
async function sendWebResponse(webResponse, res) {
  res.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));

  if (!webResponse.body) {
    res.end();
    return;
  }

  const reader = webResponse.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
}

// --- Main ---

// Dynamically import the built Worker entry
const workerModule = await import("./dist/server/index.js");
const worker = workerModule.default;

if (!worker || typeof worker.fetch !== "function") {
  console.error("ERROR: Could not load Worker fetch handler from dist/server/index.js");
  console.error("Got:", worker);
  process.exit(1);
}

console.log(`[node-server] Worker SSR handler loaded`);

const server = createServer(async (req, res) => {
  try {
    // 1. Try to serve static assets first
    if (await tryServeStatic(req, res)) return;

    // 2. Delegate to the SSR Worker handler
    const webRequest = toWebRequest(req);
    const webResponse = await worker.fetch(webRequest, {}, {});
    await sendWebResponse(webResponse, res);
  } catch (err) {
    console.error("[node-server] Request error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
    }
    res.end("Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[node-server] Listening on http://0.0.0.0:${PORT}`);
});
