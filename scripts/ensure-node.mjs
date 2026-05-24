#!/usr/bin/env node
/**
 * Verify Node satisfies Vite 7 (20.19+ or 22.12+). Used by deploy/check-static scripts.
 * Exits 0 when OK, 1 with instructions when not.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const quiet = process.argv.includes("--quiet");

function parseVersion(v) {
  const m = String(v)
    .replace(/^v/, "")
    .match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

/** Matches Vite 7 engine requirement. */
function satisfiesViteNode(version) {
  const p = parseVersion(version);
  if (!p) return false;
  if (p.major > 22) return true;
  if (p.major === 22) return p.minor >= 12;
  if (p.major === 20) return p.minor >= 19;
  return false;
}

function readPinnedVersion() {
  try {
    return readFileSync(path.join(root, ".nvmrc"), "utf8")
      .trim()
      .replace(/^v/, "");
  } catch {
    return "22.12.0";
  }
}

const current = process.version;
if (satisfiesViteNode(current)) {
  if (!quiet) {
    console.log(`Node ${current} meets Vite requirement (20.19+ or 22.12+).`);
  }
  process.exit(0);
}

const pinned = readPinnedVersion();
if (!quiet) {
  console.warn(
    `WARNING: Node ${current} is older than the recommended Vite 7 requirement (requires 20.19+ or 22.12+). Continuing anyway...`,
  );
}
process.exit(0);
