import { useAllianceStore } from "../../store/allianceStore";

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

export default function AllianceKpiPage() {
  const { members, orders, events, matches } = useAllianceStore();
  const done = orders.filter((o) => o.status === "完结").length;

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3>联盟季度目标（演示）</h3>
        <Bar label="有效会员" value={members.filter((m) => m.status === "有效").length} max={40} />
        <Bar label="联盟工单完结" value={done} max={20} />
        <Bar label="活动场次" value={events.length} max={6} />
        <Bar label="撮合有效对接" value={matches.filter((m) => m.status !== "关闭").length} max={15} />
      </div>
      <div className="card">
        <h3>联盟运行健康度</h3>
        <div className="list-row">
          <span>待审会员</span>
          <strong>{members.filter((m) => m.status === "待审").length}</strong>
        </div>
        <div className="list-row">
          <span>进行中工单</span>
          <strong>{orders.filter((o) => !["完结", "关闭"].includes(o.status)).length}</strong>
        </div>
        <div className="list-row">
          <span>报名中活动</span>
          <strong>{events.filter((e) => e.status === "报名中").length}</strong>
        </div>
        <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.88rem" }}>
          本看板仅统计联盟侧数据，与五大中心运营数据隔离。
        </p>
      </div>
    </div>
  );
}
