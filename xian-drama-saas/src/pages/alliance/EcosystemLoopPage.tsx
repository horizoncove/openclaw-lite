import { Handshake, Building2, Users, Bot, Coins, Scale } from "lucide-react";
import { useAllianceStore } from "../../store/allianceStore";
import { explainSplit, findScene } from "../../utils/dealLoop";

function pct(spent: number, budget: number) {
  return Math.min(100, Math.round((spent / Math.max(budget, 1)) * 100));
}

const PHASES = ["要约中", "待双边确认", "托管中", "履约中", "结算中", "已闭环"] as const;

export default function EcosystemLoopPage() {
  const { deals, orgWallets, scenePackages, matches, consumeDeal, settleDeal } = useAllianceStore();
  const brokerBal = orgWallets.find((w) => w.org === "联盟秘书处")?.balance ?? 0;
  const active = deals.filter((d) => d.phase !== "已闭环");
  const settled = deals.filter((d) => d.phase === "已闭环" || d.status === "已结算");

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="loop-hero ecosystem">
        <div>
          <p className="loop-eyebrow">TRANSACTION ESSENCE · 交易本质</p>
          <h3>标的是产能，Token 是托管媒介；激励来自对价切割，不是空投</h3>
          <p>
            要约 → 承诺 → 冻结对价 → 按节点履约燃烧托管 → 切割撮合费/供给激励/中心成本 → 剩余退回。
            看懂这七步，才算看懂这笔生意。
          </p>
        </div>
      </section>

      <div className="tx-pipeline">
        {PHASES.map((p) => (
          <div className="tx-pipeline-step" key={p}>
            <strong>{p}</strong>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>资金占用公式（演示会计）</h3>
        <div className="tx-formula">
          <span>买方可用 balance</span>
          <span className="arrow">—锁定→</span>
          <span>项目托管 escrow</span>
          <span className="arrow">—履约→</span>
          <span>撮合费 + 供给激励 + 中心保留</span>
          <span className="arrow">—结算→</span>
          <span>剩余退回 balance</span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>
          机构钱包同时展示 <b>可用</b> 与 <b>锁定</b>；锁定合计应约等于其作为买方的在途 escrow 之和。
        </p>
      </div>

      <div className="participant-grid">
        <article className="participant-card buyer">
          <Users size={18} />
          <h4>需求方</h4>
          <p>怕的是：付了钱没交付、预算失控。</p>
          <ul>
            <li>确认标的后才冻结</li>
            <li>钱在托管池，按节点烧</li>
            <li>结算剩余必须退回</li>
          </ul>
        </article>
        <article className="participant-card supplier">
          <Building2 size={18} />
          <h4>供给方</h4>
          <p>怕的是：干完拿不到回报。</p>
          <ul>
            <li>确认承接形成承诺</li>
            <li>激励来自托管切割</li>
            <li>里程碑进度可见</li>
          </ul>
        </article>
        <article className="participant-card broker">
          <Handshake size={18} />
          <h4>秘书处</h4>
          <p>怕的是：撮合完没下文、价值说不清。</p>
          <ul>
            <li>匹配 + 背书 + 盯单</li>
            <li>撮合费是服务对价</li>
            <li>当前可用 {brokerBal.toLocaleString()}</li>
          </ul>
        </article>
        <article className="participant-card center">
          <Bot size={18} />
          <h4>五大中心</h4>
          <p>怕的是：无预算空转、扣费说不清。</p>
          <ul>
            <li>托管生效后再接单</li>
            <li>消耗三拆可视</li>
            <li>保留部分=真干活成本</li>
          </ul>
        </article>
      </div>

      <div className="card">
        <h3>场景包 = 交易标的（不是 API 牌价）</h3>
        <div className="scene-grid">
          {scenePackages.map((s) => (
            <article className="scene-card" key={s.id}>
              <div className="scene-card-top">
                <strong>{s.name}</strong>
                <span>{(s.tokens / 1000).toFixed(0)}k</span>
              </div>
              <p className="tx-consideration">
                <Scale size={13} /> 标的：{s.consideration || s.desc}
              </p>
              <p>{s.desc}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>在途交易 · 托管与里程碑</h3>
        {deals.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无项目，请先在供需撮合中成交并冻结对价。</p>
        ) : (
          deals.map((d) => {
            const scene = findScene(d.sceneId);
            const demoSpend = Math.min(8000, d.escrow || 0);
            const split = explainSplit(demoSpend, scene);
            return (
              <div className="deal-card" key={d.id}>
                <div className="deal-card-head">
                  <div>
                    <strong>{d.title}</strong>
                    <div className="deal-meta">
                      {d.consideration || d.sceneName} · 阶段 {d.phase || d.status} · {d.id}
                    </div>
                  </div>
                  <span className={`tag ${d.status === "已结算" ? "green" : d.status === "履约中" ? "amber" : "blue"}`}>
                    {d.phase || d.status}
                  </span>
                </div>
                <div className="deal-budget-bar">
                  <div style={{ width: `${pct(d.spent, d.budget)}%` }} />
                </div>
                <div className="deal-budget-labels">
                  <span>
                    已释放 {d.spent.toLocaleString()} · 托管剩余 {(d.escrow ?? d.budget - d.spent).toLocaleString()} /{" "}
                    {d.budget.toLocaleString()}
                  </span>
                  <span>
                    费 {d.brokerEarned.toLocaleString()} · 激励 {d.supplierEarned.toLocaleString()} · 中心保留{" "}
                    {(d.centerRetained ?? 0).toLocaleString()}
                  </span>
                </div>
                {d.milestones?.length > 0 && (
                  <div className="milestone-row">
                    {d.milestones.map((m) => (
                      <span
                        key={m.id}
                        className={`milestone-chip ${m.status === "已完成" ? "done" : m.status === "进行中" ? "active" : ""}`}
                      >
                        {m.title}
                      </span>
                    ))}
                  </div>
                )}
                <div className="deal-next-grid">
                  <div><b>买方下一步</b>{d.nextActionBuyer}</div>
                  <div><b>卖方下一步</b>{d.nextActionSupplier}</div>
                  <div><b>秘书处下一步</b>{d.nextActionBroker}</div>
                  <div><b>中心下一步</b>{d.nextActionCenter}</div>
                </div>
                {d.phase !== "已闭环" && d.status !== "已结算" && (
                  <div style={{ display: "flex", gap: 8, marginTop: "0.75rem", flexWrap: "wrap" }}>
                    <button
                      className="btn btn-secondary"
                      disabled={(d.escrow ?? 0) <= 0}
                      onClick={() =>
                        consumeDeal(
                          d.id,
                          demoSpend,
                          `${d.center}节点推进（托管释放）`,
                          "xian-drama/script-v1",
                        )
                      }
                    >
                      <Coins size={14} /> 履约释放 {demoSpend.toLocaleString()}
                      <small style={{ marginLeft: 6, opacity: 0.8 }}>
                        费{split.brokerCut}/激励{split.supplierCut}/保留{split.centerKeep}
                      </small>
                    </button>
                    <button className="btn btn-ghost" onClick={() => settleDeal(d.id)}>
                      结算并退回剩余托管
                    </button>
                  </div>
                )}
                <div className="deal-ledger">
                  {d.ledger.slice(0, 5).map((l) => (
                    <div className="list-row" key={l.id}>
                      <div>
                        <strong>{l.type}</strong> · {l.note}
                        <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                          {l.actor} · {l.createdAt}
                        </div>
                      </div>
                      <span className={`tag ${l.amount >= 0 ? "green" : "amber"}`}>
                        {l.amount > 0 ? "+" : ""}
                        {l.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>飞轮指标</h3>
          <div className="list-row">
            <span>开放/撮合中要约</span>
            <strong>{matches.filter((m) => ["开放", "撮合中"].includes(m.status)).length}</strong>
          </div>
          <div className="list-row"><span>在途交易</span><strong>{active.length}</strong></div>
          <div className="list-row"><span>已闭环</span><strong>{settled.length}</strong></div>
          <div className="list-row">
            <span>全网托管中 Tokens</span>
            <strong>{deals.reduce((a, d) => a + (d.escrow || 0), 0).toLocaleString()}</strong>
          </div>
        </div>
        <div className="card">
          <h3>机构钱包 · 可用 / 锁定</h3>
          {orgWallets.slice(0, 6).map((w) => (
            <div className="list-row" key={w.org}>
              <span>
                {w.org}
                <small style={{ color: "var(--muted)" }}> · {w.role}</small>
              </span>
              <strong>
                {w.balance.toLocaleString()}
                <small style={{ color: "var(--muted)", fontWeight: 400 }}>
                  {" "}/ 锁 {(w.locked ?? 0).toLocaleString()}
                </small>
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
