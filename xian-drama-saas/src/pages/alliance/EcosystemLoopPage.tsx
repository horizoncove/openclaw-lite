import { Handshake, Building2, Users, Bot, Coins } from "lucide-react";
import { useAllianceStore } from "../../store/allianceStore";

function pct(spent: number, budget: number) {
  return Math.min(100, Math.round((spent / Math.max(budget, 1)) * 100));
}

export default function EcosystemLoopPage() {
  const { deals, orgWallets, scenePackages, matches, consumeDeal } = useAllianceStore();
  const brokerBal = orgWallets.find((w) => w.org === "联盟秘书处")?.balance ?? 0;
  const active = deals.filter((d) => d.status !== "已结算");
  const settled = deals.filter((d) => d.status === "已结算");

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="loop-hero ecosystem">
        <div>
          <p className="loop-eyebrow">ECOSYSTEM LOOP · 参与者全景</p>
          <h3>用人的方式看这条链路：谁付出、谁交付、谁收钱、谁担责</h3>
          <p>
            需求方怕踩坑与超支；供给方怕白忙；秘书处怕撮合完没下文；中心怕工单无预算。
            闭环把四方的「下一步」写在项目上，Token 只是把责任变成可流动的数字。
          </p>
        </div>
      </section>

      <div className="participant-grid">
        <article className="participant-card buyer">
          <Users size={18} />
          <h4>需求方会员</h4>
          <p>想的是：找对人、预算可控、进度看得见。</p>
          <ul>
            <li>发布供需，不必自己满城打听</li>
            <li>成交即锁场景包，超支有墙</li>
            <li>首页/项目页看到「我该做什么」</li>
          </ul>
        </article>
        <article className="participant-card supplier">
          <Building2 size={18} />
          <h4>供给方会员</h4>
          <p>想的是：订单靠谱、交付有回报、信用能累积。</p>
          <ul>
            <li>被推荐匹配，减少空转谈判</li>
            <li>履约节点自动计提激励 Token</li>
            <li>案例回流作品库，增强下一单</li>
          </ul>
        </article>
        <article className="participant-card broker">
          <Handshake size={18} />
          <h4>联盟秘书处</h4>
          <p>想的是：撮合有效、服务可计价、关系可沉淀。</p>
          <ul>
            <li>一键成交开预算，告别口头约定</li>
            <li>撮合费随履约流入秘书处钱包</li>
            <li>当前撮合费余额 {brokerBal.toLocaleString()} Tokens</li>
          </ul>
        </article>
        <article className="participant-card center">
          <Bot size={18} />
          <h4>五大中心专员</h4>
          <p>想的是：工单有预算、扣费有依据、别背锅。</p>
          <ul>
            <li>关联 Deal 的工单自动生成</li>
            <li>按任务消耗，分账规则透明</li>
            <li>预算耗尽自动提示结算</li>
          </ul>
        </article>
      </div>

      <div className="card">
        <h3>场景包 · 把「抽象 Token」翻译成业务语言</h3>
        <div className="scene-grid">
          {scenePackages.map((s) => (
            <article className="scene-card" key={s.id}>
              <div className="scene-card-top">
                <strong>{s.name}</strong>
                <span>{(s.tokens / 1000).toFixed(0)}k Tokens</span>
              </div>
              <p>{s.desc}</p>
              <div className="scene-roles">
                <span><b>买方</b>{s.forBuyer}</span>
                <span><b>卖方</b>{s.forSupplier}</span>
                <span><b>秘书处</b>{s.forBroker}</span>
                <span><b>中心</b>{s.forCenter}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>在途项目 · Token 流动实况</h3>
        {deals.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无项目，请先在供需撮合中「成交并开预算」。</p>
        ) : (
          deals.map((d) => (
            <div className="deal-card" key={d.id}>
              <div className="deal-card-head">
                <div>
                  <strong>{d.title}</strong>
                  <div className="deal-meta">
                    {d.sceneName} · {d.center} · {d.id}
                  </div>
                </div>
                <span className={`tag ${d.status === "已结算" ? "green" : d.status === "履约中" ? "amber" : "blue"}`}>
                  {d.status}
                </span>
              </div>
              <div className="deal-budget-bar">
                <div style={{ width: `${pct(d.spent, d.budget)}%` }} />
              </div>
              <div className="deal-budget-labels">
                <span>已耗 {d.spent.toLocaleString()} / {d.budget.toLocaleString()}</span>
                <span>撮合费 {d.brokerEarned.toLocaleString()} · 供给激励 {d.supplierEarned.toLocaleString()}</span>
              </div>
              <div className="deal-next-grid">
                <div><b>买方下一步</b>{d.nextActionBuyer}</div>
                <div><b>卖方下一步</b>{d.nextActionSupplier}</div>
                <div><b>秘书处下一步</b>{d.nextActionBroker}</div>
                <div><b>中心下一步</b>{d.nextActionCenter}</div>
              </div>
              {d.status !== "已结算" && (
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: "0.75rem" }}
                  onClick={() =>
                    consumeDeal(
                      d.id,
                      Math.min(8000, d.budget - d.spent),
                      `${d.center}节点推进（演示扣费）`,
                      "xian-drama/script-v1",
                    )
                  }
                >
                  <Coins size={14} /> 模拟中心履约扣费
                </button>
              )}
              <div className="deal-ledger">
                {d.ledger.slice(0, 4).map((l) => (
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
          ))
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>飞轮指标</h3>
          <div className="list-row"><span>开放/撮合中供需</span><strong>{matches.filter((m) => ["开放", "撮合中"].includes(m.status)).length}</strong></div>
          <div className="list-row"><span>在途项目</span><strong>{active.length}</strong></div>
          <div className="list-row"><span>已结算项目</span><strong>{settled.length}</strong></div>
          <div className="list-row"><span>秘书处累计撮合费（在途计提）</span><strong>{deals.reduce((a, d) => a + d.brokerEarned, 0).toLocaleString()}</strong></div>
        </div>
        <div className="card">
          <h3>机构钱包速览</h3>
          {orgWallets.slice(0, 6).map((w) => (
            <div className="list-row" key={w.org}>
              <span>{w.org}<small style={{ color: "var(--muted)" }}> · {w.role}</small></span>
              <strong>{w.balance.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
