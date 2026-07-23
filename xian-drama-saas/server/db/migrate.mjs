import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { query, checkDb, closePool } from "./pool.mjs";
import { seedAlliance, seedCenter, resetAllianceState, resetCenterState } from "./repo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_VERSION = 2;
const DATA_SEED_VERSION = 3;

async function applySchema() {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await query(sql);
}

async function ensureMigration() {
  const r = await query("SELECT version FROM schema_migrations WHERE version = $1", [SCHEMA_VERSION]);
  if (r.rows.length > 0) return;
  await query("INSERT INTO schema_migrations (version) VALUES ($1)", [SCHEMA_VERSION]);
}

async function needsAllianceSeed() {
  const r = await query("SELECT COUNT(*)::int AS n FROM members");
  return r.rows[0].n === 0;
}

async function needsCenterSeed() {
  const r = await query("SELECT COUNT(*)::int AS n FROM approvals");
  return r.rows[0].n === 0;
}

async function needsDataRefresh() {
  const r = await query("SELECT version FROM schema_migrations WHERE version = $1", [DATA_SEED_VERSION]);
  return r.rows.length === 0;
}

async function markDataRefresh() {
  await query("INSERT INTO schema_migrations (version) VALUES ($1)", [DATA_SEED_VERSION]);
}

async function main() {
  console.log("[migrate] connecting to database...");
  const ok = await checkDb();
  if (!ok) throw new Error("database connection failed");

  console.log("[migrate] applying schema...");
  await applySchema();
  await ensureMigration();

  const allianceSeed = JSON.parse(readFileSync(join(__dirname, "..", "data", "alliance-seed.json"), "utf8"));
  const centerSeed = JSON.parse(readFileSync(join(__dirname, "..", "data", "center-seed.json"), "utf8"));

  if (await needsDataRefresh()) {
    console.log("[migrate] refreshing rich demo data (v3)...");
    await resetAllianceState(allianceSeed);
    await resetCenterState(centerSeed);
    await markDataRefresh();
  } else if (await needsAllianceSeed()) {
    console.log("[migrate] seeding alliance data...");
    await seedAlliance(allianceSeed);
  } else {
    console.log("[migrate] alliance data present, skip");
  }

  if (!(await needsDataRefresh()) && (await needsCenterSeed())) {
    console.log("[migrate] seeding center data...");
    await seedCenter(centerSeed);
  } else if (!(await needsDataRefresh())) {
    console.log("[migrate] center data present, skip");
  }

  console.log("[migrate] done");
}

main()
  .catch((err) => {
    console.error("[migrate] error:", err.message);
    process.exit(1);
  })
  .finally(() => closePool());
