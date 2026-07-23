import { useCenterStore } from "../../store/centerStore";

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

export default function CenterKpiPage() {
  const { orders, approvals, overseas, distributions, copyrights, ais } = useCenterStore();
  const done = orders.filter((o) => o.status === "完结").length;

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3>中心季度目标（演示）</h3>
        <Bar label="工单完结" value={done} max={30} />
        <Bar label="出海项目推进" value={overseas.length} max={10} />
        <Bar label="审批预检产出" value={approvals.length} max={20} />
        <Bar label="发行在管" value={distributions.length} max={15} />
        <Bar label="版权案件" value={copyrights.length} max={15} />
        <Bar label="AI 接入" value={ais.length} max={10} />
      </div>
      <div className="card">
        <h3>中心运行健康度</h3>
        <div className="list-row">
          <span>进行中工单</span>
          <strong>{orders.filter((o) => !["完结", "关闭"].includes(o.status)).length}</strong>
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
          本看板仅统计五大中心侧数据，与联盟会员数据隔离。
        </p>
      </div>
    </div>
  );
}
