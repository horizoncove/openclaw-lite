import { useState } from "react";
import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../utils/memberContext";
import type { WorkOrder } from "../../../types";

const SERVICE_TYPES = [
  "会员入会咨询",
  "活动席位协调",
  "供需撮合协助",
  "政策资讯索取",
  "其他秘书处服务",
];

export default function MemberServicesPage() {
  const { user, members, orders, upsertOrder } = useAllianceStore();
  const org = findMemberOrg(user, members);
  const myOrders = orders.filter((o) => o.org === org?.name);
  const [product, setProduct] = useState(SERVICE_TYPES[0]);
  const [summary, setSummary] = useState("");

  const submit = () => {
    if (!org || !summary.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date();
    due.setDate(due.getDate() + 5);
    const order: WorkOrder = {
      id: `AL-2026-${String(orders.length + 10).padStart(3, "0")}`,
      product,
      center: "联盟",
      org: org.name,
      contact: user?.name ?? org.contact,
      priority: "中",
      status: "新建",
      assignee: "联盟-陈希",
      createdAt: today,
      dueAt: due.toISOString().slice(0, 10),
      summary: summary.trim(),
    };
    upsertOrder(order);
    setSummary("");
  };

  return (
    <div className="member-page">
      <div className="member-card">
        <h3>向联盟秘书处提交服务申请</h3>
        <p className="member-page-intro" style={{ marginBottom: "1rem" }}>
          入会、活动、撮合等事项可通过此表单提交，秘书处将在工单中跟进。
        </p>
        <div className="field">
          <label>服务类型</label>
          <select value={product} onChange={(e) => setProduct(e.target.value)}>
            {SERVICE_TYPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>需求说明</label>
          <textarea
            placeholder="请描述您的具体需求…"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
          />
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={!org}>
          提交申请
        </button>
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <h3>我的申请进度</h3>
        {myOrders.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无申请记录。</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>单号</th>
                  <th>服务</th>
                  <th>状态</th>
                  <th>提交日</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>
                      {o.product}
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{o.summary}</div>
                    </td>
                    <td>
                      <span className="tag blue">{o.status}</span>
                    </td>
                    <td>{o.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
