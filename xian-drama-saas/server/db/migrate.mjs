import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { query, checkDb, closePool } from "./pool.mjs";
import { seedAll } from "./repo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_VERSION = 1;

async function applySchema() {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await query(sql);
}

async function ensureMigration() {
  const r = await query("SELECT version FROM schema_migrations WHERE version = $1", [SCHEMA_VERSION]);
  if (r.rows.length > 0) return false;
  await query("INSERT INTO schema_migrations (version) VALUES ($1)", [SCHEMA_VERSION]);
  return true;
}

async function needsSeed() {
  const r = await query("SELECT COUNT(*)::int AS n FROM members");
  return r.rows[0].n === 0;
}

async function main() {
  console.log("[migrate] connecting to database...");
  const ok = await checkDb();
  if (!ok) throw new Error("database connection failed");

  console.log("[migrate] applying schema...");
  await applySchema();
  await ensureMigration();

  if (await needsSeed()) {
    console.log("[migrate] seeding initial data...");
    const seed = JSON.parse(readFileSync(join(__dirname, "..", "data", "seed.json"), "utf8"));
    await seedAll(seed);
    console.log("[migrate] seed complete");
  } else {
    console.log("[migrate] data already present, skip seed");
  }

  console.log("[migrate] done");
}

main()
  .catch((err) => {
    console.error("[migrate] error:", err.message);
    process.exit(1);
  })
  .finally(() => closePool());
