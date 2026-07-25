import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORTALS = {
  alliance: {
    dbPath: process.env.ALLIANCE_DB_PATH || join(__dirname, "data", "alliance-db.json"),
    seedPath: join(__dirname, "data", "alliance-seed.json"),
  },
  center: {
    dbPath: process.env.CENTER_DB_PATH || join(__dirname, "data", "center-db.json"),
    seedPath: join(__dirname, "data", "center-seed.json"),
  },
  overseas: {
    dbPath: process.env.OVERSEAS_DB_PATH || join(__dirname, "data", "overseas-db.json"),
    seedPath: join(__dirname, "data", "overseas-seed.json"),
  },
};

function loadSeed(portal) {
  return JSON.parse(readFileSync(PORTALS[portal].seedPath, "utf8"));
}

export function loadDb(portal) {
  const { dbPath } = PORTALS[portal];
  if (!existsSync(dbPath)) {
    const seed = loadSeed(portal);
    mkdirSync(dirname(dbPath), { recursive: true });
    writeFileSync(dbPath, JSON.stringify(seed, null, 2), "utf8");
    return structuredClone(seed);
  }
  return JSON.parse(readFileSync(dbPath, "utf8"));
}

export function saveDb(portal, data) {
  const { dbPath } = PORTALS[portal];
  mkdirSync(dirname(dbPath), { recursive: true });
  writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
}

export function resetDb(portal) {
  const data = structuredClone(loadSeed(portal));
  saveDb(portal, data);
  return data;
}
