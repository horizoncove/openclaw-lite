#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", "data", ".git"]);
const KEY_RE = /sk-[a-zA-Z0-9]{20,}/g;
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|mjs|cjs|ts|tsx|json|md|html|css|env|txt|yml|yaml)$/i.test(name) || name === ".env.example") {
      const text = readFileSync(p, "utf8");
      // allow placeholder in .env.example only if not a real-looking long key after sk-
      for (const m of text.matchAll(KEY_RE)) {
        const val = m[0];
        if (val.includes("your_deepseek") || val.endsWith("here")) continue;
        if (name === ".env.example" && /your_|change.me|example/i.test(text)) continue;
        hits.push({ file: path.relative(ROOT, p), sample: val.slice(0, 12) + "…" });
      }
    }
  }
}

walk(ROOT);
if (hits.length) {
  console.error("security-scan FAIL: possible API keys found");
  for (const h of hits) console.error(` - ${h.file}: ${h.sample}`);
  process.exit(1);
}
console.log("security-scan PASS: no sk-* secrets detected under apps/minorguard-api");
