import { query } from "./pool.mjs";

function fmtDate(v) {
  if (!v) return v;
  if (typeof v === "string") return v.slice(0, 10);
  return v.toISOString().slice(0, 10);
}

function mapMember(r) {
  return {
    id: r.id,
    name: r.name,
    tier: r.tier,
    type: r.type,
    tags: r.tags ?? [],
    contact: r.contact,
    phone: r.phone,
    status: r.status,
    joinedAt: fmtDate(r.joined_at),
    city: r.city,
  };
}

function mapEvent(r) {
  return {
    id: r.id,
    title: r.title,
    date: fmtDate(r.event_date),
    place: r.place,
    type: r.type,
    status: r.status,
    capacity: r.capacity,
    enrolled: r.enrolled,
  };
}

function mapMatch(r) {
  return {
    id: r.id,
    org: r.org,
    need: r.need,
    offer: r.offer,
    status: r.status,
    owner: r.owner,
    updatedAt: fmtDate(r.updated_at),
  };
}

function mapOrder(r) {
  return {
    id: r.id,
    product: r.product,
    center: r.center,
    org: r.org,
    contact: r.contact,
    priority: r.priority,
    status: r.status,
    assignee: r.assignee,
    createdAt: fmtDate(r.created_at),
    dueAt: fmtDate(r.due_at),
    summary: r.summary,
  };
}

function mapApproval(r) {
  return {
    id: r.id,
    title: r.title,
    org: r.org,
    risk: r.risk,
    stage: r.stage,
    result: r.result ?? undefined,
    updatedAt: fmtDate(r.updated_at),
  };
}

function mapOverseas(r) {
  return {
    id: r.id,
    title: r.title,
    market: r.market,
    stage: r.stage,
    score: r.score,
    owner: r.owner,
    updatedAt: fmtDate(r.updated_at),
  };
}

function mapDistribution(r) {
  return {
    id: r.id,
    title: r.title,
    platform: r.platform,
    budget: r.budget,
    stage: r.stage,
    roi: r.roi ?? undefined,
    owner: r.owner,
  };
}

function mapCopyright(r) {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    org: r.org,
    updatedAt: fmtDate(r.updated_at),
  };
}

function mapAi(r) {
  return {
    id: r.id,
    org: r.org,
    line: r.line,
    status: r.status,
    lift: r.lift ?? undefined,
    owner: r.owner,
  };
}

export async function getState() {
  const [members, events, matches, orders, approvals, overseas, distributions, copyrights, ais] =
    await Promise.all([
      listMembers(),
      listEvents(),
      listMatches(),
      listOrders(),
      listApprovals(),
      listOverseas(),
      listDistributions(),
      listCopyrights(),
      listAis(),
    ]);
  return { members, events, matches, orders, approvals, overseas, distributions, copyrights, ais };
}

export async function resetState(seed) {
  await query("TRUNCATE members, events, matches, work_orders, approvals, overseas_projects, distributions, copyrights, ai_projects CASCADE");
  await seedAll(seed);
  return getState();
}

export async function listMembers() {
  const r = await query("SELECT * FROM members ORDER BY joined_at DESC");
  return r.rows.map(mapMember);
}

export async function upsertMember(item) {
  await query(
    `INSERT INTO members (id, name, tier, type, tags, contact, phone, status, joined_at, city)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO UPDATE SET
       name=$2, tier=$3, type=$4, tags=$5, contact=$6, phone=$7, status=$8, joined_at=$9, city=$10, updated_at=NOW()`,
    [item.id, item.name, item.tier, item.type, JSON.stringify(item.tags ?? []), item.contact, item.phone ?? "", item.status, item.joinedAt, item.city ?? "西安"]
  );
  const r = await query("SELECT * FROM members WHERE id=$1", [item.id]);
  return mapMember(r.rows[0]);
}

export async function patchMember(id, patch) {
  const cur = await query("SELECT * FROM members WHERE id=$1", [id]);
  if (!cur.rows[0]) return null;
  const merged = { ...mapMember(cur.rows[0]), ...patch };
  return upsertMember(merged);
}

export async function listEvents() {
  const r = await query("SELECT * FROM events ORDER BY event_date DESC");
  return r.rows.map(mapEvent);
}

export async function upsertEvent(item) {
  await query(
    `INSERT INTO events (id, title, event_date, place, type, status, capacity, enrolled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET title=$2, event_date=$3, place=$4, type=$5, status=$6, capacity=$7, enrolled=$8`,
    [item.id, item.title, item.date, item.place, item.type, item.status, item.capacity ?? 0, item.enrolled ?? 0]
  );
  const r = await query("SELECT * FROM events WHERE id=$1", [item.id]);
  return mapEvent(r.rows[0]);
}

export async function patchEvent(id, patch) {
  const cur = await query("SELECT * FROM events WHERE id=$1", [id]);
  if (!cur.rows[0]) return null;
  const m = { ...mapEvent(cur.rows[0]), ...patch };
  return upsertEvent(m);
}

export async function saveMatch(item) {
  await query(
    `INSERT INTO matches (id, org, need, offer, status, owner, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET org=$2, need=$3, offer=$4, status=$5, owner=$6, updated_at=$7`,
    [item.id, item.org, item.need, item.offer, item.status, item.owner, item.updatedAt]
  );
  const r = await query("SELECT * FROM matches WHERE id=$1", [item.id]);
  return mapMatch(r.rows[0]);
}

export async function listMatches() {
  const r = await query("SELECT * FROM matches ORDER BY updated_at DESC");
  return r.rows.map(mapMatch);
}

export async function patchMatch(id, patch) {
  const cur = await query("SELECT * FROM matches WHERE id=$1", [id]);
  if (!cur.rows[0]) return null;
  const m = { ...mapMatch(cur.rows[0]), ...patch };
  await query(
    `UPDATE matches SET org=$2, need=$3, offer=$4, status=$5, owner=$6, updated_at=$7 WHERE id=$1`,
    [m.id, m.org, m.need, m.offer, m.status, m.owner, m.updatedAt]
  );
  const r = await query("SELECT * FROM matches WHERE id=$1", [id]);
  return mapMatch(r.rows[0]);
}

export async function upsertOrder(item) {
  await query(
    `INSERT INTO work_orders (id, product, center, org, contact, priority, status, assignee, created_at, due_at, summary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO UPDATE SET
       product=$2, center=$3, org=$4, contact=$5, priority=$6, status=$7, assignee=$8, created_at=$9, due_at=$10, summary=$11`,
    [item.id, item.product, item.center, item.org, item.contact, item.priority ?? "中", item.status ?? "新建", item.assignee, item.createdAt, item.dueAt, item.summary ?? ""]
  );
  const r = await query("SELECT * FROM work_orders WHERE id=$1", [item.id]);
  return mapOrder(r.rows[0]);
}

export async function patchOrder(id, patch) {
  const cur = await query("SELECT * FROM work_orders WHERE id=$1", [id]);
  if (!cur.rows[0]) return null;
  return upsertOrder({ ...mapOrder(cur.rows[0]), ...patch });
}

export async function listOrders(portal = "all") {
  if (portal === "alliance") {
    const r = await query("SELECT * FROM work_orders WHERE center = '联盟' ORDER BY created_at DESC");
    return r.rows.map(mapOrder);
  }
  if (portal === "center") {
    const r = await query("SELECT * FROM work_orders WHERE center <> '联盟' ORDER BY created_at DESC");
    return r.rows.map(mapOrder);
  }
  const r = await query("SELECT * FROM work_orders ORDER BY created_at DESC");
  return r.rows.map(mapOrder);
}

export async function getAllianceState() {
  const [members, events, matches, orders] = await Promise.all([
    listMembers(),
    listEvents(),
    listMatches(),
    listOrders("alliance"),
  ]);
  return { members, events, matches, orders };
}

export async function getCenterState() {
  const [orders, approvals, overseas, distributions, copyrights, ais, walletRow] =
    await Promise.all([
      listOrders("center"),
      listApprovals(),
      listOverseas(),
      listDistributions(),
      listCopyrights(),
      listAis(),
      query("SELECT data FROM center_extras WHERE key = 'tokenWallet'"),
    ]);
  const tokenWallet = walletRow.rows[0]?.data ?? null;
  return { orders, approvals, overseas, distributions, copyrights, ais, tokenWallet };
}

export async function resetAllianceState(seed) {
  await query("TRUNCATE members, events, matches CASCADE");
  await query("DELETE FROM work_orders WHERE center = '联盟'");
  await seedAlliance(seed);
  return getAllianceState();
}

export async function resetCenterState(seed) {
  await query("TRUNCATE approvals, overseas_projects, distributions, copyrights, ai_projects CASCADE");
  await query("DELETE FROM work_orders WHERE center <> '联盟'");
  await seedCenter(seed);
  if (seed.tokenWallet) await saveTokenWallet(seed.tokenWallet);
  return getCenterState();
}

export async function getAllianceStats() {
  const r = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM members WHERE status = '有效') AS members,
      (SELECT COUNT(*)::int FROM work_orders WHERE center = '联盟' AND status NOT IN ('完结', '关闭')) AS open_orders,
      (SELECT COUNT(*)::int FROM events WHERE status <> '已结束') AS events,
      (SELECT COUNT(*)::int FROM matches WHERE status IN ('开放', '撮合中')) AS matches
  `);
  const s = r.rows[0];
  return { members: s.members, openOrders: s.open_orders, events: s.events, matches: s.matches };
}

export async function getCenterStats() {
  const r = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM work_orders WHERE center <> '联盟' AND status NOT IN ('完结', '关闭')) AS open_orders,
      (SELECT COUNT(*)::int FROM approvals) AS approvals,
      (SELECT COUNT(*)::int FROM overseas_projects) AS overseas,
      (SELECT COUNT(*)::int FROM distributions) AS distributions,
      (SELECT COUNT(*)::int FROM copyrights) AS copyrights,
      (SELECT COUNT(*)::int FROM ai_projects) AS ais
  `);
  const s = r.rows[0];
  return {
    openOrders: s.open_orders,
    approvals: s.approvals,
    overseas: s.overseas,
    distributions: s.distributions,
    copyrights: s.copyrights,
    ais: s.ais,
  };
}

export async function seedAlliance(seed) {
  for (const m of seed.members ?? []) await upsertMember(m);
  for (const e of seed.events ?? []) await upsertEvent(e);
  for (const m of seed.matches ?? []) {
    await query(
      `INSERT INTO matches (id, org, need, offer, status, owner, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.org, m.need, m.offer, m.status, m.owner, m.updatedAt]
    );
  }
  for (const o of seed.orders ?? []) await upsertOrder(o);
}

export async function seedCenter(seed) {
  for (const o of seed.orders ?? []) await upsertOrder(o);
  for (const a of seed.approvals ?? []) {
    await query(
      `INSERT INTO approvals (id, title, org, risk, stage, result, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.title, a.org, a.risk, a.stage, a.result ?? null, a.updatedAt]
    );
  }
  for (const o of seed.overseas ?? []) {
    await query(
      `INSERT INTO overseas_projects (id, title, market, stage, score, owner, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [o.id, o.title, o.market, o.stage, o.score, o.owner, o.updatedAt]
    );
  }
  for (const d of seed.distributions ?? []) {
    await query(
      `INSERT INTO distributions (id, title, platform, budget, stage, roi, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [d.id, d.title, d.platform, d.budget, d.stage, d.roi ?? null, d.owner]
    );
  }
  for (const c of seed.copyrights ?? []) {
    await query(
      `INSERT INTO copyrights (id, title, type, status, org, updated_at) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.title, c.type, c.status, c.org, c.updatedAt]
    );
  }
  for (const a of seed.ais ?? []) {
    await query(
      `INSERT INTO ai_projects (id, org, line, status, lift, owner) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.org, a.line, a.status, a.lift ?? null, a.owner]
    );
  }
}

export async function listApprovals() {
  const r = await query("SELECT * FROM approvals ORDER BY updated_at DESC");
  return r.rows.map(mapApproval);
}

export async function patchApproval(id, patch) {
  const cur = await query("SELECT * FROM approvals WHERE id=$1", [id]);
  if (!cur.rows[0]) return null;
  const m = { ...mapApproval(cur.rows[0]), ...patch };
  await query(
    `UPDATE approvals SET title=$2, org=$3, risk=$4, stage=$5, result=$6, updated_at=$7 WHERE id=$1`,
    [m.id, m.title, m.org, m.risk, m.stage, m.result ?? null, m.updatedAt]
  );
  const r = await query("SELECT * FROM approvals WHERE id=$1", [id]);
  return mapApproval(r.rows[0]);
}

export async function listOverseas() {
  const r = await query("SELECT * FROM overseas_projects ORDER BY updated_at DESC");
  return r.rows.map(mapOverseas);
}

export async function patchOverseas(id, patch) {
  const cur = await query("SELECT * FROM overseas_projects WHERE id=$1", [id]);
  if (!cur.rows[0]) return null;
  const m = { ...mapOverseas(cur.rows[0]), ...patch };
  await query(
    `UPDATE overseas_projects SET title=$2, market=$3, stage=$4, score=$5, owner=$6, updated_at=$7 WHERE id=$1`,
    [m.id, m.title, m.market, m.stage, m.score, m.owner, m.updatedAt]
  );
  const r = await query("SELECT * FROM overseas_projects WHERE id=$1", [id]);
  return mapOverseas(r.rows[0]);
}

export async function listDistributions() {
  const r = await query("SELECT * FROM distributions ORDER BY id");
  return r.rows.map(mapDistribution);
}

export async function listCopyrights() {
  const r = await query("SELECT * FROM copyrights ORDER BY updated_at DESC");
  return r.rows.map(mapCopyright);
}

export async function listAis() {
  const r = await query("SELECT * FROM ai_projects ORDER BY id");
  return r.rows.map(mapAi);
}

export async function getTokenWallet() {
  const r = await query("SELECT data FROM center_extras WHERE key = 'tokenWallet'");
  return r.rows[0]?.data ?? null;
}

export async function saveTokenWallet(wallet) {
  await query(
    `INSERT INTO center_extras (key, data) VALUES ('tokenWallet', $1)
     ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = NOW()`,
    [JSON.stringify(wallet)]
  );
  return wallet;
}

export async function getStats() {
  const r = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM members WHERE status = '有效') AS members,
      (SELECT COUNT(*)::int FROM work_orders WHERE status NOT IN ('完结', '关闭')) AS open_orders,
      (SELECT COUNT(*)::int FROM overseas_projects) AS overseas,
      (SELECT COUNT(*)::int FROM events WHERE status <> '已结束') AS events,
      (SELECT COUNT(*)::int FROM approvals) AS approvals,
      (SELECT COUNT(*)::int FROM distributions) AS distributions,
      (SELECT COUNT(*)::int FROM copyrights) AS copyrights,
      (SELECT COUNT(*)::int FROM ai_projects) AS ais
  `);
  const s = r.rows[0];
  return {
    members: s.members,
    openOrders: s.open_orders,
    overseas: s.overseas,
    events: s.events,
    approvals: s.approvals,
    distributions: s.distributions,
    copyrights: s.copyrights,
    ais: s.ais,
  };
}

export async function seedAll(seed) {
  for (const m of seed.members ?? []) await upsertMember(m);
  for (const e of seed.events ?? []) await upsertEvent(e);
  for (const m of seed.matches ?? []) {
    await query(
      `INSERT INTO matches (id, org, need, offer, status, owner, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [m.id, m.org, m.need, m.offer, m.status, m.owner, m.updatedAt]
    );
  }
  for (const o of seed.orders ?? []) await upsertOrder(o);
  for (const a of seed.approvals ?? []) {
    await query(
      `INSERT INTO approvals (id, title, org, risk, stage, result, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.title, a.org, a.risk, a.stage, a.result ?? null, a.updatedAt]
    );
  }
  for (const o of seed.overseas ?? []) {
    await query(
      `INSERT INTO overseas_projects (id, title, market, stage, score, owner, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [o.id, o.title, o.market, o.stage, o.score, o.owner, o.updatedAt]
    );
  }
  for (const d of seed.distributions ?? []) {
    await query(
      `INSERT INTO distributions (id, title, platform, budget, stage, roi, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [d.id, d.title, d.platform, d.budget, d.stage, d.roi ?? null, d.owner]
    );
  }
  for (const c of seed.copyrights ?? []) {
    await query(
      `INSERT INTO copyrights (id, title, type, status, org, updated_at) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.title, c.type, c.status, c.org, c.updatedAt]
    );
  }
  for (const a of seed.ais ?? []) {
    await query(
      `INSERT INTO ai_projects (id, org, line, status, lift, owner) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.org, a.line, a.status, a.lift ?? null, a.owner]
    );
  }
}
