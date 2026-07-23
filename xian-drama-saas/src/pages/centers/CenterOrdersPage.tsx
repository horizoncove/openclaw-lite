import { useMemo, useState } from "react";
import { useCenterStore } from "../../store/centerStore";
import type { OrderStatus, Priority, WorkOrder } from "../../types";

const centers = ["审批", "出海", "发行投流", "版权", "AI"] as const;

export default function CenterOrdersPage() {
  const { orders, upsertOrder } = useCenterStore();
  const [q, setQ] = useState("");
  const [center, setCenter] = useState("全部");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<WorkOrder>>({
    product: "P02 备案材料预检",
    center: "审批",
    priority: "中",
    status: "新建",
  });

  const list = useMemo(() => {
    return orders.filter((o) => {
      const hit =
        !q ||
        o.id.includes(q) ||
        o.org.includes(q) ||
        o.product.includes(q) ||
        o.summary.includes(q);
      const c = center === "全部" || o.center === center;
      return hit && c;
    });
  }, [orders, q, center]);

  const create = () => {
    if (!form.org || !form.product || !form.summary) return;
    const id = `WO-2026-${String(orders.length + 21).padStart(3, "0")}`;
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date();
    due.setDate(due.getDate() + 3);
    upsertOrder({
      id,
      product: form.product!,
      center: form.center || "审批",
      org: form.org!,
      contact: form.contact || "待补充",
      priority: (form.priority as Priority) || "中",
      status: (form.status as OrderStatus) || "新建",
      assignee: form.assignee || "待分派",
      createdAt: today,
      dueAt: due.toISOString().slice(0, 10),
      summary: form.summary!,
    });
    setOpen(false);
  };

  return (
    <div className="card">
      <div className="toolbar">
        <input placeholder="搜索工单号/机构/产品" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={center} onChange={(e) => setCenter(e.target.value)}>
          <option>全部</option>
          {centers.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          新建中心工单
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>工单</th>
              <th>产品/中心</th>
              <th>机构</th>
              <th>优先级</th>
              <th>状态</th>
              <th>受理人</th>
              <th>截止</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.id}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{o.summary}</div>
                </td>
                <td>
                  {o.product}
                  <div>
                    <span className="tag blue">{o.center}</span>
                  </div>
                </td>
                <td>{o.org}</td>
                <td>
                  <span className={`tag ${o.priority === "高" ? "red" : o.priority === "中" ? "amber" : "gray"}`}>
                    {o.priority}
                  </span>
                </td>
                <td>{o.status}</td>
                <td>{o.assignee}</td>
                <td>{o.dueAt}</td>
                <td>
                  <select
                    value={o.status}
                    onChange={(e) => upsertOrder({ ...o, status: e.target.value as OrderStatus })}
                  >
                    {["新建", "处理中", "待客户", "完结", "关闭"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>新建中心工单</h3>
            <div className="field">
              <label>机构</label>
              <input value={form.org || ""} onChange={(e) => setForm({ ...form, org: e.target.value })} />
            </div>
            <div className="field">
              <label>联系人</label>
              <input value={form.contact || ""} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div className="field">
              <label>产品</label>
              <input value={form.product || ""} onChange={(e) => setForm({ ...form, product: e.target.value })} />
            </div>
            <div className="field">
              <label>中心</label>
              <select value={form.center} onChange={(e) => setForm({ ...form, center: e.target.value })}>
                {centers.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>摘要</label>
              <textarea value={form.summary || ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={create}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
