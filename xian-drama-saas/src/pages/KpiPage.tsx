import { useStore } from "../store";

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
        <span>{label}</span>
        <strong>
          {value}/{max}
        </strong>
      </div>
      <div style={{ height: 8, background: "#eee7dc", borderRadius: 99, marginTop: 6 }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 99,
            background: pct >= 80 ? "#166534" : pct >= 50 ? "#b45309" : "#9a3412",
          }}
        />
      </div>
    </div>
  );
}

export default function KpiPage() {
  const { members, orders, events, approvals, overseas, matches } = useStore();
  const done = orders.filter((o) => o.status === "完结").length;
  const ontime = orders.filter((o) => o.status === "完结" || o.status === "处理中").length;

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3>季度目标进度（演示）</h3>
        <Bar label="有效会员" value={members.filter((m) => m.status === "有效").length} max={40} />
        <Bar label="工单完结" value={done} max={30} />
        <Bar label="出海项目推进" value={overseas.length} max={10} />
        <Bar label="审批预检产出" value={approvals.length} max={20} />
        <Bar label="活动场次" value={events.length} max={6} />
        <Bar label="撮合有效对接" value={matches.filter((m) => m.status !== "关闭").length} max={15} />
      </div>
      <div className="card">
        <h3>运行健康度</h3>
        <div className="list-row">
          <span>工单活跃数</span>
          <strong>{ontime}</strong>
        </div>
        <div className="list-row">
          <span>待审会员</span>
          <strong>{members.filter((m) => m.status === "待审").length}</strong>
        </div>
        <div className="list-row">
          <span>高优先级工单</span>
          <strong>{orders.filter((o) => o.priority === "高" && o.status !== "完结").length}</strong>
        </div>
        <div className="list-row">
          <span>出海谈判/上线</span>
          <strong>
            {overseas.filter((o) => o.stage === "谈判" || o.stage === "上线" || o.stage === "结算").length}
          </strong>
        </div>
        <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.88rem" }}>
          指标口径对齐汇报方案附件 G：联盟、审批、出海、发行、版权、AI 分中心考核可在此扩展权重配置。
        </p>
      </div>
    </div>
  );
}
