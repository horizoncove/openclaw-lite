import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Coins,
  Globe2,
  Megaphone,
  Scale,
  Stamp,
} from "lucide-react";
import { useCenterStore } from "../../store/centerStore";
import { buildCenterPanorama } from "../../utils/centerPanorama";

const CENTER_ICONS = {
  approval: Stamp,
  overseas: Globe2,
  distribution: Megaphone,
  copyright: Scale,
  ai: Bot,
} as const;

function TrendBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="panorama-trend-item">
      <span>{label}</span>
      <div className="panorama-trend-track">
        <div className="panorama-trend-fill" style={{ width: `${pct}%` }} />
      </div>
      <strong>{(value / 1000).toFixed(1)}k</strong>
    </div>
  );
}

export default function CenterPanoramaPage() {
  const state = useCenterStore();
  const panorama = buildCenterPanorama(state);
  const trendMax = Math.max(...panorama.tokenUsageTrend.map((t) => t.value), 1);

  return (
    <div className="panorama-page">
      <section className="panorama-hero">
        <div>
          <p className="panorama-eyebrow">CENTER PANORAMA · 五大中心全景</p>
          <h3>运营数据看板</h3>
          <p>跨中心工单、业务负荷、Token 消耗一屏总览，数据与联盟侧完全隔离。</p>
        </div>
        <Link className="btn btn-primary" to="/center/console/tokens">
          <Coins size={16} /> Token 聚合服务 <ArrowRight size={14} />
        </Link>
      </section>

      <div className="grid grid-4">
        <div className="card panorama-kpi">
          <div className="stat-value">{panorama.summary.openOrders}</div>
          <div className="stat-label">进行中工单</div>
        </div>
        <div className="card panorama-kpi">
          <div className="stat-value">{panorama.summary.totalWorkload}</div>
          <div className="stat-label">在管业务项</div>
        </div>
        <div className="card panorama-kpi">
          <div className="stat-value">{(panorama.summary.tokenBalance / 1000).toFixed(1)}k</div>
          <div className="stat-label">Token 余额</div>
        </div>
        <div className="card panorama-kpi warn">
          <div className="stat-value">{panorama.summary.highPriority}</div>
          <div className="stat-label">高优先级工单</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: "1rem" }}>
        <div className="card">
          <h3>五大中心负荷矩阵</h3>
          <div className="panorama-center-grid">
            {panorama.centers.map((c) => {
              const Icon = CENTER_ICONS[c.id];
              const loadPct = Math.min(100, Math.round((c.active / Math.max(c.workload, 1)) * 100));
              return (
                <Link className="panorama-center-card" key={c.id} to={c.link}>
                  <div className="panorama-center-head">
                    <Icon size={18} />
                    <strong>{c.name}</strong>
                    {c.alerts > 0 && (
                      <span className="tag red">
                        <AlertTriangle size={12} /> {c.alerts}
                      </span>
                    )}
                  </div>
                  <div className="panorama-center-stats">
                    <span>在管 {c.workload}</span>
                    <span>活跃 {c.active}</span>
                  </div>
                  <div className="panorama-load-track">
                    <div className="panorama-load-fill" style={{ width: `${loadPct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3>Token 近 7 日消耗趋势</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            本月已用 {(panorama.summary.monthlyTokenUsage / 1000).toFixed(1)}k / 200k
          </p>
          {panorama.tokenUsageTrend.map((t) => (
            <TrendBar key={t.label} label={t.label} value={t.value} max={trendMax} />
          ))}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: "1rem" }}>
        <div className="card">
          <h3>工单按中心分布</h3>
          {Object.entries(panorama.ordersByCenter).map(([name, count]) => (
            <div className="list-row" key={name}>
              <span>{name}</span>
              <strong>{count} 单</strong>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>近期 Token 流水</h3>
          {panorama.recentTransactions.map((tx) => (
            <div className="list-row" key={tx.id}>
              <div>
                <strong>{tx.note}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {tx.createdAt} {tx.model ? `· ${tx.model}` : ""}
                </div>
              </div>
              <span className={`tag ${tx.type === "充值" ? "green" : "amber"}`}>
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>待跟进工单</h3>
        {panorama.recentOrders.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无进行中工单</p>
        ) : (
          panorama.recentOrders.map((o) => (
            <div className="list-row" key={o.id}>
              <div>
                <strong>{o.id}</strong> · {o.product}
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {o.center} · {o.org} · 截止 {o.dueAt}
                </div>
              </div>
              <span className={`tag ${o.priority === "高" ? "red" : "blue"}`}>{o.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
