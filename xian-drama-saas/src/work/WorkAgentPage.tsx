import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useWorkDemo } from "./workDemoStore";

export function WorkAgentPage() {
  const {
    user,
    messages,
    pendingConfirm,
    askAgent,
    confirmPending,
    cancelPending,
    bounties,
    orders,
  } = useWorkDemo();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingConfirm]);

  const ctx = useMemo(() => {
    if (!user) return null;
    if (user.role === "client") {
      const waiting = bounties.find((b) => b.status === "open" && b.applicants.length > 0);
      if (waiting) {
        return {
          tag: "待确认应征",
          title: waiting.title,
          body: `${waiting.applicants.length} 人应征 · 预算 ${waiting.budgetT} T`,
          to: `/work/bounties/${waiting.id}`,
        };
      }
      const toAccept = orders.find((o) => o.status === "in_progress" || o.status === "escrowed");
      if (toAccept) {
        return {
          tag: toAccept.status === "in_progress" ? "待验收" : "托管中",
          title: toAccept.title,
          body: `冻结 ${toAccept.frozenT} T · ${toAccept.supplierOrg}`,
          to: `/work/orders/${toAccept.id}`,
        };
      }
      return {
        tag: "下一步",
        title: "买 Token，或发一条悬赏",
        body: "Agent 代拟；购 T / 确认合作 / 验收须你点头。",
        to: "/work/wallet",
      };
    }
    const open = bounties.find((b) => b.status === "open");
    const mine = orders.find((o) => o.status !== "paid");
    if (mine) {
      return {
        tag: mine.status === "escrowed" ? "托管履约" : "进行中",
        title: mine.title,
        body: `预算 ${mine.budgetT} T · ${mine.clientOrg}`,
        to: `/work/orders/${mine.id}`,
      };
    }
    if (open) {
      return {
        tag: "可接悬赏",
        title: open.title,
        body: `${open.category} · ${open.budgetT} T · ${open.clientOrg}`,
        to: `/work/bounties/${open.id}`,
      };
    }
    return {
      tag: "待命",
      title: "暂无新任务",
      body: "切换客户账号发悬赏后再回来。",
      to: "/work/bounties",
    };
  }, [user, bounties, orders]);

  const pendingLabel = useMemo(() => {
    if (!pendingConfirm) return null;
    if (pendingConfirm.type === "buy") {
      return {
        title: "确认购买 Token",
        desc: `购入 ${pendingConfirm.amountT} T（约 ¥${pendingConfirm.cny}）。向平台预付服务额度。`,
      };
    }
    if (pendingConfirm.type === "match") {
      const b = bounties.find((x) => x.id === pendingConfirm.bountyId);
      const a = b?.applicants.find((x) => x.id === pendingConfirm.applicantId);
      return {
        title: "确认合作并冻结",
        desc: `与 ${a?.org ?? ""} · ${a?.name ?? ""} 合作「${b?.title ?? ""}」，冻结 ${b?.budgetT ?? 0} T。`,
      };
    }
    const o = orders.find((x) => x.id === pendingConfirm.orderId);
    return {
      title: "确认验收并放款",
      desc: `验收「${o?.title ?? ""}」后，平台向供应商结算（演示扣 5% 撮合费）。`,
    };
  }, [pendingConfirm, bounties, orders]);

  const quick =
    user?.role === "client"
      ? ["买 Token", "发悬赏", "查看应征", "待验收", "查余额"]
      : ["看看可接任务", "应征", "标记履约", "查余额"];

  function send(raw?: string) {
    const v = (raw ?? text).trim();
    if (!v) return;
    askAgent(v);
    setText("");
  }

  return (
    <div className="work-main">
      <section className="work-chat">
        <div className="work-stage">
          <p className="work-stage-kicker">Conversation</p>
          <h2 className="work-stage-title">跟 Agent 把这一单做完</h2>
        </div>
        <div className="work-messages">
          {messages.map((m) => (
            <div key={m.id} className={`work-line ${m.from}`}>
              <span className="who">
                {m.from === "agent" ? "Agent" : m.from === "user" ? "你" : "系统"}
              </span>
              <div className="body">{m.text}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="work-dock">
          {pendingLabel && (
            <div className="work-confirm">
              <strong>{pendingLabel.title}</strong>
              <p>{pendingLabel.desc}</p>
              <div className="work-confirm-actions">
                <button type="button" className="work-btn work-btn-primary" onClick={confirmPending}>
                  确认执行
                </button>
                <button type="button" className="work-btn work-btn-ghost" onClick={cancelPending}>
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="work-quick">
            {quick.map((q) => (
              <button key={q} type="button" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
          <form
            className="work-composer"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="对 Agent 说…（Enter 发送，Shift+Enter 换行）"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="submit" className="work-btn work-btn-primary">
              发送
            </button>
          </form>
        </div>
      </section>

      <aside className="work-side">
        <h2>此刻</h2>
        {ctx && (
          <div className="work-ctx">
            <div className="label">{ctx.tag}</div>
            <h3>{ctx.title}</h3>
            <p>{ctx.body}</p>
            <Link className="work-btn work-btn-ghost" to={ctx.to}>
              打开
            </Link>
          </div>
        )}
        <div className="work-script">
          <div className="label">演示剧本</div>
          客户购 T → 发悬赏 → 换供应商应征 → 换回客户确认冻结 → 履约 → 验收放款。
        </div>
      </aside>
    </div>
  );
}
