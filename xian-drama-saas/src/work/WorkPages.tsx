import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWorkDemo } from "./workDemoStore";

export function WorkWalletPage() {
  const { balance, frozen, ledger, requestBuy, user } = useWorkDemo();
  const [amount, setAmount] = useState(500);
  const nav = useNavigate();

  return (
    <div className="work-page">
      <h1>钱包</h1>
      <p className="sub">官方购入平台积分 T。演示价 1¥ = 1T。可申请发票（占位）。</p>
      <div className="work-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="work-item">
          <div className="row">
            <span>可用余额</span>
            <span className="budget">{balance} T</span>
          </div>
        </div>
        <div className="work-item">
          <div className="row">
            <span>托管冻结</span>
            <span className="budget">{frozen} T</span>
          </div>
        </div>
      </div>

      {user?.role === "client" && (
        <form
          className="work-form"
          style={{ marginBottom: "1.5rem" }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            requestBuy(amount);
            nav("/work");
          }}
        >
          <label>
            购入套餐（T）
            <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}>
              <option value={200}>200 T · ¥200</option>
              <option value={500}>500 T · ¥500</option>
              <option value={1000}>1000 T · ¥1000</option>
            </select>
          </label>
          <button type="submit" className="work-btn work-btn-primary">
            发起购买（需在工作区确认）
          </button>
          <button type="button" className="work-btn work-btn-ghost">
            申请发票 / 对公信息（演示占位）
          </button>
        </form>
      )}

      <h2 style={{ fontFamily: "var(--w-display)", marginBottom: "0.75rem" }}>流水</h2>
      {ledger.length === 0 ? (
        <div className="work-empty">暂无流水</div>
      ) : (
        <table className="work-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>说明</th>
              <th>变动</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((r) => (
              <tr key={r.id}>
                <td>{r.at}</td>
                <td>{r.label}</td>
                <td className={r.delta >= 0 ? "work-pos" : "work-neg"}>
                  {r.delta >= 0 ? "+" : ""}
                  {r.delta} T
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: "1rem" }}>
        <Link className="work-nav-link" to="/work">
          ← 回工作区
        </Link>
      </p>
    </div>
  );
}

export function WorkBountiesPage() {
  const { bounties, user } = useWorkDemo();
  const list =
    user?.role === "supplier"
      ? bounties.filter((b) => b.status === "open" || b.applicants.some((a) => a.id === user.id))
      : bounties;

  return (
    <div className="work-page">
      <h1>{user?.role === "supplier" ? "可接悬赏" : "我的悬赏 / 大厅"}</h1>
      <p className="sub">品类为微短剧履约（译制 / 配音 / 发行）。单位 T。</p>
      {list.length === 0 ? (
        <div className="work-empty">暂无悬赏</div>
      ) : (
        <div className="work-grid">
          {list.map((b) => (
            <Link key={b.id} to={`/work/bounties/${b.id}`} className="work-item">
              <div className="row">
                <span className="tag" style={{ color: "var(--w-accent)" }}>
                  {b.category}
                </span>
                <span className="budget">{b.budgetT} T</span>
              </div>
              <strong>{b.title}</strong>
              <p style={{ color: "var(--w-muted)", fontSize: "0.88rem" }}>{b.summary}</p>
              <div className="work-meta">
                <span>
                  {b.clientOrg} · <b>{b.applicants.length}</b> 应征
                </span>
                <span className={`work-status ${b.status}`}>{b.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkBountyNewPage() {
  const { publishBounty, user } = useWorkDemo();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("译制");
  const [budgetT, setBudgetT] = useState(300);
  const [deadline, setDeadline] = useState("2026-08-30");

  if (user?.role !== "client") {
    return (
      <div className="work-page">
        <div className="work-empty">仅客户可发布悬赏</div>
      </div>
    );
  }

  return (
    <div className="work-page">
      <h1>发布悬赏</h1>
      <p className="sub">也可在工作区对 Agent 说「发悬赏」由助手代拟。</p>
      <form
        className="work-form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!title.trim()) return;
          publishBounty({ title, summary, category, budgetT, deadline });
          nav("/work/bounties");
        }}
      >
        <label>
          标题
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          描述
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
        </label>
        <label>
          品类
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>译制</option>
            <option>配音</option>
            <option>发行</option>
            <option>剪辑</option>
          </select>
        </label>
        <label>
          预算（T）
          <input
            type="number"
            min={50}
            value={budgetT}
            onChange={(e) => setBudgetT(Number(e.target.value))}
          />
        </label>
        <label>
          期限
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <button type="submit" className="work-btn work-btn-primary">
          发布到大厅
        </button>
      </form>
    </div>
  );
}

export function WorkBountyDetailPage() {
  const { id } = useParams();
  const { bounties, user, applyBounty, requestMatch } = useWorkDemo();
  const nav = useNavigate();
  const b = bounties.find((x) => x.id === id);
  const [note, setNote] = useState("档期可排，请确认合作。");

  if (!b) {
    return (
      <div className="work-page">
        <div className="work-empty">悬赏不存在</div>
      </div>
    );
  }

  return (
    <div className="work-page">
      <p className="sub">
        <Link to="/work/bounties">← 列表</Link>
      </p>
      <h1>{b.title}</h1>
      <p className="sub">{b.summary}</p>
      <div className="work-meta" style={{ marginBottom: "1rem" }}>
        <span className="work-status open">{b.category}</span>
        <span>
          预算 <b>{b.budgetT} T</b>
        </span>
        <span>
          期限 <b>{b.deadline}</b>
        </span>
        <span>
          发布方 <b>{b.clientOrg}</b>
        </span>
        <span className={`work-status ${b.status}`}>{b.status}</span>
      </div>

      {user?.role === "supplier" && b.status === "open" && (
        <form
          className="work-form"
          style={{ marginBottom: "1.5rem" }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            applyBounty(b.id, note);
            nav("/work");
          }}
        >
          <label>
            应征留言
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </label>
          <button type="submit" className="work-btn work-btn-primary">
            应征
          </button>
        </form>
      )}

      <h2 style={{ fontFamily: "var(--w-display)", marginBottom: "0.75rem" }}>应征列表</h2>
      {b.applicants.length === 0 ? (
        <div className="work-empty">暂无应征</div>
      ) : (
        <div className="work-grid">
          {b.applicants.map((a) => (
            <div key={a.id} className="work-item">
              <strong>
                {a.org} · {a.name}
              </strong>
              <p style={{ color: "var(--w-muted)", fontSize: "0.88rem" }}>{a.note}</p>
              {user?.role === "client" && b.status === "open" && (
                <button
                  type="button"
                  className="work-btn work-btn-primary"
                  onClick={() => {
                    requestMatch(b.id, a.id);
                    nav("/work");
                  }}
                >
                  确认合作（去工作区确认冻结）
                </button>
              )}
              {b.selectedApplicantId === a.id && (
                <span className="work-status matched">已选定</span>
              )}
            </div>
          ))}
        </div>
      )}

      {b.orderId && (
        <p style={{ marginTop: "1rem" }}>
          <Link className="work-btn work-btn-ghost" to={`/work/orders/${b.orderId}`}>
            查看订单
          </Link>
        </p>
      )}
    </div>
  );
}

export function WorkOrdersPage() {
  const { orders } = useWorkDemo();
  return (
    <div className="work-page">
      <h1>我的订单</h1>
      <p className="sub">托管中 → 履约中 → 已放款</p>
      {orders.length === 0 ? (
        <div className="work-empty">暂无订单</div>
      ) : (
        <div className="work-grid">
          {orders.map((o) => (
            <Link key={o.id} to={`/work/orders/${o.id}`} className="work-item">
              <div className="row">
                <span className={`work-status ${o.status}`}>{o.status}</span>
                <span className="budget">{o.budgetT} T</span>
              </div>
              <strong>{o.title}</strong>
              <div className="work-meta">
                <span>{o.clientOrg}</span>
                <span>→</span>
                <span>{o.supplierOrg}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkOrderDetailPage() {
  const { id } = useParams();
  const { orders, user, markDelivered, requestAccept } = useWorkDemo();
  const nav = useNavigate();
  const o = orders.find((x) => x.id === id);

  if (!o) {
    return (
      <div className="work-page">
        <div className="work-empty">订单不存在</div>
      </div>
    );
  }

  return (
    <div className="work-page">
      <p className="sub">
        <Link to="/work/orders">← 订单列表</Link>
      </p>
      <h1>{o.title}</h1>
      <p className="sub">
        {o.clientOrg} → {o.supplierOrg} · {o.supplierName}
      </p>
      <div className="work-meta" style={{ marginBottom: "1.25rem" }}>
        <span className={`work-status ${o.status}`}>{o.status}</span>
        <span>
          冻结 <b>{o.frozenT} T</b>
        </span>
        {o.paidT != null && (
          <span>
            已放款 <b>{o.paidT} T</b>
          </span>
        )}
      </div>

      <div className="work-ctx-card" style={{ marginBottom: "1rem" }}>
        <span className="tag">时间线</span>
        <p>
          已确认 → 托管冻结
          {o.status !== "escrowed" ? " → 履约中" : ""}
          {o.status === "paid" ? " → 验收通过 → 已放款至供应商" : ""}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {user?.role === "supplier" && o.status === "escrowed" && (
          <button
            type="button"
            className="work-btn work-btn-primary"
            onClick={() => {
              markDelivered(o.id);
              nav("/work");
            }}
          >
            标记履约 / 交付待验收
          </button>
        )}
        {user?.role === "client" && o.status !== "paid" && (
          <button
            type="button"
            className="work-btn work-btn-primary"
            onClick={() => {
              requestAccept(o.id);
              nav("/work");
            }}
          >
            发起验收（去工作区确认）
          </button>
        )}
        <Link className="work-btn work-btn-ghost" to="/work">
          回工作区
        </Link>
      </div>
    </div>
  );
}
