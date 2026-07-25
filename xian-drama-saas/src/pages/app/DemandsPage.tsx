import { useEffect, useState } from "react";
import { p1Api } from "../../api/p1Client";
import { useP1Store } from "../../store/p1Store";
import type { P1Demand, P1DemandApplication } from "../../p1/types";

export default function DemandsPage() {
  const { user, bump, refreshFlag } = useP1Store();
  const [plaza, setPlaza] = useState<P1Demand[]>([]);
  const [mine, setMine] = useState<P1Demand[]>([]);
  const [apps, setApps] = useState<Record<string, P1DemandApplication[]>>({});
  const [tab, setTab] = useState<"plaza" | "mine">("plaza");
  const [form, setForm] = useState({
    title: "",
    need: "",
    offer: "",
    category: "译制",
    budget: "面议",
  });

  const load = async () => {
    const [a, b] = await Promise.all([
      p1Api.demands.list("plaza"),
      p1Api.demands.list("mine"),
    ]);
    setPlaza(a);
    setMine(b);
    const map: Record<string, P1DemandApplication[]> = {};
    for (const d of [...a, ...b]) {
      map[d.id] = await p1Api.demands.applications(d.id);
    }
    setApps(map);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [refreshFlag]);

  const list = tab === "plaza" ? plaza : mine;

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <p className="member-page-intro">
        已发布工作需求对<strong>全联盟</strong>可见。可浏览广场、应征对接，或发布你的供需。
      </p>

      <div className="card">
        <h3>发布需求</h3>
        <div className="grid grid-2">
          <div className="field">
            <label>标题</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例如：寻英西双语字幕团队"
            />
          </div>
          <div className="field">
            <label>类型</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {["译制", "投放", "编剧", "演员", "场地", "其他"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>需要什么</label>
            <textarea
              value={form.need}
              onChange={(e) => setForm({ ...form, need: e.target.value })}
            />
          </div>
          <div className="field">
            <label>可提供什么</label>
            <textarea
              value={form.offer}
              onChange={(e) => setForm({ ...form, offer: e.target.value })}
            />
          </div>
        </div>
        <div className="toolbar">
          <input
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            placeholder="预算"
          />
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!form.title.trim() || !form.need.trim()) return;
              await p1Api.demands.create({ ...form, publish: true });
              setForm({ title: "", need: "", offer: "", category: "译制", budget: "面议" });
              bump();
              await load();
            }}
          >
            发布到全联盟
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <button
            className={`btn ${tab === "plaza" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("plaza")}
          >
            全联盟广场
          </button>
          <button
            className={`btn ${tab === "mine" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("mine")}
          >
            我发布的
          </button>
        </div>
        {list.map((d) => (
          <article key={d.id} className="os-market-card" style={{ marginBottom: "0.85rem" }}>
            <div className="os-platform-head">
              <h3 style={{ margin: 0 }}>{d.title}</h3>
              <span className="tag">{d.status}</span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {d.orgName} · {d.category} · 预算 {d.budget} · 截止 {d.dueAt}
            </p>
            <p>
              <strong>需求：</strong>
              {d.need}
            </p>
            <p>
              <strong>可提供：</strong>
              {d.offer || "—"}
            </p>
            <div className="toolbar">
              {d.orgId !== user?.orgId && ["published", "matching"].includes(d.status) && (
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    const message = window.prompt("应征说明") || "希望对接";
                    await p1Api.demands.apply(d.id, message);
                    bump();
                    await load();
                  }}
                >
                  应征对接
                </button>
              )}
            </div>
            {(apps[d.id] || []).length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                <strong style={{ fontSize: "0.85rem" }}>应征列表</strong>
                {(apps[d.id] || []).map((a) => (
                  <div className="list-row" key={a.id}>
                    <div>
                      <strong>{a.orgName}</strong>
                      <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{a.message}</div>
                    </div>
                    <div className="toolbar" style={{ margin: 0 }}>
                      <span className="tag">{a.status}</span>
                      {d.orgId === user?.orgId && a.status === "pending" && (
                        <button
                          className="btn btn-primary"
                          onClick={async () => {
                            await p1Api.demands.confirm(d.id, a.id);
                            bump();
                            await load();
                          }}
                        >
                          确认成交
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
        {list.length === 0 && <div className="empty">暂无需求</div>}
      </div>
    </div>
  );
}
