#!/usr/bin/env node
/**
 * Emit firebase.json with Cloud Run run.target from root .env (does not modify repo firebase.json).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(root, "firebase.json");
const outDir = path.join(root, ".firebase");
const outPath = path.join(outDir, "deploy-firebase.json");

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = { ...process.env, ...loadEnv() };
const serviceId = env.BACKEND_SERVICE_NAME || "bluelock-backend";
const region = env.GCP_REGION || "us-central1";

const cfg = JSON.parse(fs.readFileSync(templatePath, "utf8"));
// Paths in generated config are relative to .firebase/deploy-firebase.json
if (cfg.hosting?.public) {
  cfg.hosting.public = path
    .relative(outDir, path.join(root, cfg.hosting.public))
    .split(path.sep)
    .join("/");
}
for (const r of cfg.hosting?.rewrites ?? []) {
  if (r.run) {
    r.run.serviceId = serviceId;
    r.run.region = region;
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
console.log(outPath);
