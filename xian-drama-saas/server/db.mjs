import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "data", "db.json");
const SEED_PATH = join(__dirname, "data", "seed.json");

function loadSeed() {
  return JSON.parse(readFileSync(SEED_PATH, "utf8"));
}

export function loadDb() {
  if (!existsSync(DB_PATH)) {
    const seed = loadSeed();
    mkdirSync(dirname(DB_PATH), { recursive: true });
    writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), "utf8");
    return structuredClone(seed);
  }
  return JSON.parse(readFileSync(DB_PATH, "utf8"));
}

export function saveDb(data) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function resetDb() {
  const data = structuredClone(loadSeed());
  saveDb(data);
  return data;
}
