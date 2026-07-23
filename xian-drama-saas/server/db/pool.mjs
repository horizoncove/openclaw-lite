import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      "postgresql://xian_drama:xian_drama_pass@127.0.0.1:5432/xian_drama";
    pool = new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function checkDb() {
  const r = await query("SELECT 1 AS ok");
  return r.rows[0]?.ok === 1;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
