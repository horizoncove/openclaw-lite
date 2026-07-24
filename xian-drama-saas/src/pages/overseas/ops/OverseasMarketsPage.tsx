import { useOverseasStore } from "../../../store/overseasStore";

export default function OverseasMarketsPage() {
  const { markets } = useOverseasStore();

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <p className="member-page-intro">
        目标市场情报用于选品与商务谈判参考，定期由出海运营更新。
      </p>
      <div className="os-market-grid">
        {markets.map((m) => (
          <article key={m.id} className="card os-market-card">
            <div className="os-platform-head">
              <h3>{m.market}</h3>
              <span className="tag">CPM {m.avgCpm}</span>
            </div>
            <p className="os-market-trend">{m.trend}</p>
            <div className="member-tags" style={{ margin: "0.75rem 0" }}>
              {m.hotGenres.map((g) => (
                <span className="tag blue" key={g}>
                  {g}
                </span>
              ))}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{m.note}</p>
            <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.75rem" }}>
              更新于 {m.updatedAt}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
