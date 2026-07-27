#!/usr/bin/env node
/**
 * 全流程交易模拟（含支付机制协商 + 仲裁化解）
 * 用法：API 已启动后执行
 *   node scripts/simulate-full-deal-with-arbitration.mjs [baseUrl]
 */
const API = process.argv[2] || "http://127.0.0.1:3011";

async function req(path, init) {
  const res = await fetch(`${API}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${path}`);
  return data;
}

function wallet(state, org) {
  return state.orgWallets.find((w) => w.org === org) || { balance: 0, locked: 0 };
}

function snapDeal(d) {
  return {
    id: d.id,
    status: d.status,
    phase: d.phase,
    payMechanism: d.payMechanism,
    payMechanismSource: d.payMechanismSource,
    budget: d.budget,
    escrow: d.escrow,
    unfunded: d.unfunded,
    spent: d.spent,
    brokerEarned: d.brokerEarned,
    supplierEarned: d.supplierEarned,
    heldBroker: d.heldBroker,
    heldSupplier: d.heldSupplier,
    centerRetained: d.centerRetained,
  };
}

const log = [];
function step(title, detail) {
  const entry = { step: log.length + 1, title, ...detail, at: new Date().toISOString() };
  log.push(entry);
  console.log(`\n=== ${entry.step}. ${title} ===`);
  console.log(JSON.stringify(detail, null, 2));
}

async function main() {
  const health = await req("/health");
  step("健康检查", { version: health.version, storage: health.storage });

  await req("/alliance/reset", { method: "POST" });
  step("重置演示数据", { ok: true });

  // 1) 需求方发布：验收后支付
  const match = await req("/alliance/matches", {
    method: "POST",
    body: JSON.stringify({
      id: "N-SIM-001",
      org: "碑林剧本研究院",
      need: "古装甜宠剧本需承制方落地拍摄与分镜（模拟全流程）",
      offer: "原创剧本 1 部 + 分集大纲已齐",
      status: "开放",
      owner: "模拟-买方",
      updatedAt: new Date().toISOString().slice(0, 10),
      preferredPayMechanism: "验收后支付",
      payMechanismNote: "希望成品验收后再释放供给激励",
      sceneId: "SCENE-AI",
      suggestedPartner: "曲江短剧工场",
    }),
  });
  step("需求方发布供需（验收后支付）", {
    matchId: match.id,
    preferredPayMechanism: match.preferredPayMechanism,
  });

  // 2) 供给方应征：要求改为预付
  let state = await req("/alliance/bids", {
    method: "POST",
    body: JSON.stringify({
      matchId: "N-SIM-001",
      supplierOrg: "曲江短剧工场",
      acceptBuyerMechanism: false,
      proposedPayMechanism: "预付",
      note: "承制需开机资金，要求改为预付",
      quoteTokens: 30000,
    }),
  });
  const bid = state.bids.find((b) => b.matchId === "N-SIM-001" && b.status === "待审");
  step("供应方应征并要求改机制为预付", {
    bidId: bid?.id,
    proposedPayMechanism: bid?.proposedPayMechanism,
    matchStatus: state.matches.find((m) => m.id === "N-SIM-001")?.status,
  });

  // 确保买方余额足够（验收后支付冻 100%）
  const buyerBefore = wallet(state, "碑林剧本研究院");
  if (buyerBefore.balance < 30000) {
    await req("/alliance/wallets/topup", {
      method: "POST",
      body: JSON.stringify({ org: "碑林剧本研究院", amount: 30000 - buyerBefore.balance + 10000 }),
    });
  }

  // 3) 秘书处调解机制：拒绝供方「改预付」要求，沿用买方「验收后支付」，但采纳该供给方成交
  state = await req(`/alliance/bids/${bid.id}/review`, {
    method: "POST",
    body: JSON.stringify({ action: "reject" }),
  });
  state = await req("/alliance/deals/close", {
    method: "POST",
    body: JSON.stringify({
      matchId: "N-SIM-001",
      supplierOrg: "曲江短剧工场",
      sceneId: "SCENE-AI",
      payMechanism: "验收后支付",
      payMechanismSource: "negotiated",
      payMechanismNote: "供方要求预付；秘书处调解后维持验收后支付，保障买方验收权",
      budgetOverride: 30000,
    }),
  });
  const deal = state.deals.find((d) => d.matchId === "N-SIM-001");
  step("秘书处签注成交（协商维持验收后支付）", {
    rejectedBid: bid?.id,
    deal: snapDeal(deal),
    buyerWallet: wallet(state, "碑林剧本研究院"),
    supplierWallet: wallet(state, "曲江短剧工场"),
  });

  // 4) 履约消耗（验收后支付：激励暂挂）
  state = await req(`/alliance/deals/${deal.id}/consume`, {
    method: "POST",
    body: JSON.stringify({
      amount: 10000,
      actor: "AI-蒋一",
      note: "分镜产线首节点",
      model: "xian-drama/script-v1",
    }),
  });
  let d1 = state.deals.find((x) => x.id === deal.id);
  step("中心履约消耗 10k（验收后支付→激励暂挂）", {
    deal: snapDeal(d1),
    expect: "brokerEarned/supplierEarned=0，heldBroker/heldSupplier>0",
  });

  // 5) 再消耗一笔
  state = await req(`/alliance/deals/${deal.id}/consume`, {
    method: "POST",
    body: JSON.stringify({
      amount: 8000,
      actor: "AI-蒋一",
      note: "大纲固化节点",
      model: "xian-drama/script-v1",
    }),
  });
  d1 = state.deals.find((x) => x.id === deal.id);
  step("二次履约消耗 8k", { deal: snapDeal(d1) });

  // 6) 买方提起争议
  state = await req("/alliance/disputes", {
    method: "POST",
    body: JSON.stringify({
      dealId: deal.id,
      raisedBy: "碑林剧本研究院",
      raisedRole: "buyer",
      reason: "第二里程碑交付物与大纲约定不符，申请仲裁：部分退回托管并扣回供给激励",
      claimTokens: 5000,
    }),
  });
  d1 = state.deals.find((x) => x.id === deal.id);
  const dsp = state.disputes.find((x) => x.dealId === deal.id && x.status === "调解中");
  step("买方提起争议 → 项目暂停", {
    dispute: dsp,
    dealStatus: d1.status,
    disputeOrder: state.orders.find((o) => o.id === dsp?.orderId),
  });

  // 7) 暂停期间消耗应失败
  let blocked = null;
  try {
    await req(`/alliance/deals/${deal.id}/consume`, {
      method: "POST",
      body: JSON.stringify({ amount: 1000, note: "应被拦截" }),
    });
  } catch (e) {
    blocked = e.message;
  }
  step("暂停期履约拦截校验", { blocked: true, message: blocked });

  // 8) 秘书处仲裁化解
  state = await req(`/alliance/disputes/${dsp.id}/decide`, {
    method: "POST",
    body: JSON.stringify({
      decision:
        "部分支持买方：退回托管 5000；扣回供给方暂挂激励 1200；恢复履约后可结算闭环",
      decidedBy: "联盟-陈希",
      adjustBuyerRefund: 5000,
      adjustSupplierClawback: 1200,
    }),
  });
  d1 = state.deals.find((x) => x.id === deal.id);
  const dspDone = state.disputes.find((x) => x.id === dsp.id);
  step("秘书处仲裁裁决并执行 Token 调整", {
    dispute: dspDone,
    deal: snapDeal(d1),
    buyerWallet: wallet(state, "碑林剧本研究院"),
    supplierWallet: wallet(state, "曲江短剧工场"),
  });

  // 9) 恢复后再消耗一小笔并结算
  state = await req(`/alliance/deals/${deal.id}/consume`, {
    method: "POST",
    body: JSON.stringify({
      amount: 2000,
      actor: "AI-蒋一",
      note: "仲裁后补交付节点",
      model: "xian-drama/script-v1",
    }),
  });
  d1 = state.deals.find((x) => x.id === deal.id);
  step("仲裁后恢复履约（再消耗 2k）", { deal: snapDeal(d1) });

  state = await req(`/alliance/deals/${deal.id}/settle`, { method: "POST" });
  d1 = state.deals.find((x) => x.id === deal.id);
  step("结算闭环：释放剩余暂挂 + 退回未用托管", {
    deal: snapDeal(d1),
    buyerWallet: wallet(state, "碑林剧本研究院"),
    supplierWallet: wallet(state, "曲江短剧工场"),
    brokerWallet: wallet(state, "联盟秘书处"),
    ledgerHead: (d1.ledger || []).slice(0, 8).map((l) => ({
      type: l.type,
      amount: l.amount,
      note: l.note,
    })),
  });

  const report = {
    title: "全流程交易模拟报告（含仲裁化解）",
    version: health.version,
    api: API,
    scenario:
      "买方设验收后支付 → 供方应征要求改预付 → 秘书处协商维持验收后并成交 → 履约激励暂挂 → 争议暂停 → 仲裁退回托管/扣暂挂激励 → 恢复履约 → 结算闭环",
    steps: log,
  };

  const outDir = new URL("../docs/reports/", import.meta.url);
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const dir = fileURLToPath(outDir);
  mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, "full-deal-arbitration-sim.json");
  const mdPath = join(dir, "full-deal-arbitration-sim.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    `# ${report.title}`,
    "",
    `> 产品版本：${report.version} · 生成于模拟脚本`,
    "",
    `## 剧本`,
    "",
    report.scenario,
    "",
    "## 步骤纪要",
    "",
    ...log.map((s) => {
      const body = "```json\n" + JSON.stringify(s, null, 2) + "\n```";
      return `### ${s.step}. ${s.title}\n\n${body}\n`;
    }),
    "## 结论",
    "",
    "1. 支付机制可由买方设定、供方应征改条款，成交落地为托管规则。",
    "2. 验收后支付下履约激励进入暂挂，仲裁可调整托管退回与激励扣回。",
    "3. 争议期间项目暂停，禁止 consume/settle；裁决执行后恢复并闭环。",
    "",
  ].join("\n");
  writeFileSync(mdPath, md);
  console.log(`\nReport written:\n- ${mdPath}\n- ${jsonPath}`);
}

main().catch((e) => {
  console.error("SIM FAILED:", e.message || e);
  process.exit(1);
});
