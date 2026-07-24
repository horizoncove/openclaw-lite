import { useEffect, useState } from "react";
import { p1Api } from "../../api/p1Client";
import { useP1Store } from "../../store/p1Store";
import type { P1Opportunity } from "../../p1/types";

export default function OpportunitiesPage() {
  const { bump, refreshFlag } = useP1Store();
  const [list, setList] = useState<P1Opportunity[]>([]);

  useEffect(() => {
    p1Api.opportunities.list().then(setList).catch(console.error);
  }, [refreshFlag]);

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <p className="member-page-intro">路演、试点、场地等机会。提交意向后秘书处可跟进撮合。</p>
      <div className="os-market-grid">
        {list.map((o) => (
          <article key={o.id} className="card os-market-card">
            <div className="os-platform-head">
              <h3>{o.title}</h3>
              <span className="tag blue">{o.kind}</span>
            </div>
            <p className="os-market-trend">{o.summary}</p>
            <div className="member-tags" style={{ margin: "0.75rem 0" }}>
              {o.tags.map((t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>截止 {o.deadline}</p>
            <button
              className="btn btn-secondary"
              style={{ marginTop: "0.75rem" }}
              onClick={async () => {
                const note = window.prompt("意向说明") || "希望参与";
                await p1Api.opportunities.interest(o.id, note);
                bump();
                alert("意向已提交");
              }}
            >
              提交意向
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
