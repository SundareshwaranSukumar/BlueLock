#!/usr/bin/env node
/**
 * TanStack Start Cloudflare builds omit index.html.
 * Generate a Firebase Hosting entry that references hashed client assets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = path.join(root, "frontend", "dist", "client");
const assetsDir = path.join(clientDir, "assets");

if (!fs.existsSync(assetsDir)) {
  console.error(`Missing ${assetsDir}. Run: cd frontend && npm run build`);
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const jsFiles = files
  .filter((f) => f.startsWith("index-") && f.endsWith(".js"))
  .map((f) => ({ name: f, size: fs.statSync(path.join(assetsDir, f)).size }))
  .sort((a, b) => b.size - a.size);

const cssFile = files.find((f) => f.startsWith("styles-") && f.endsWith(".css"));
const mainJs = jsFiles[0]?.name;
const preloadJs = jsFiles[1]?.name;

if (!mainJs || !cssFile) {
  console.error("Could not locate client bundles in dist/client/assets");
  process.exit(1);
}

const preloadTag = preloadJs
  ? `  <link rel="modulepreload" href="/assets/${preloadJs}" />\n`
  : "";

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BlueLock — Smart Stadium Command Grid</title>
    <meta name="description" content="Crowd dispersal and stadium operations at M. Chinnaswamy" />
    <link rel="stylesheet" href="/assets/${cssFile}" />
${preloadTag}  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/assets/${mainJs}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(clientDir, "index.html"), html, "utf8");
console.log(`Wrote ${path.join(clientDir, "index.html")}`);
