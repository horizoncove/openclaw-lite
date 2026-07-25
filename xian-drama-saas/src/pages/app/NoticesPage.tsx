import { useEffect, useState } from "react";
import { p1Api } from "../../api/p1Client";
import { useP1Store } from "../../store/p1Store";
import type { P1Notice } from "../../p1/types";

export default function NoticesPage() {
  const { user, bump, refreshFlag } = useP1Store();
  const [notices, setNotices] = useState<(P1Notice & { read: boolean })[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    setNotices(await p1Api.notices.list());
  };

  useEffect(() => {
    load().catch(console.error);
  }, [refreshFlag]);

  const canPublish = user?.role === "secretariat" || user?.role === "ops";

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      {canPublish && (
        <div className="card">
          <h3>发布联盟通知</h3>
          <div className="field">
            <label>标题</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>正文</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!title.trim()) return;
              await p1Api.notices.publish({ title, body, audience: "全体会员" });
              setTitle("");
              setBody("");
              bump();
              await load();
            }}
          >
            发布
          </button>
        </div>
      )}

      <div className="card">
        <h3>通知列表</h3>
        {notices.map((n) => (
          <div className="list-row" key={n.id}>
            <div>
              <strong>
                {n.title} {n.forceRead ? "· 必读" : ""}
              </strong>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 4 }}>{n.body}</div>
              <div style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: 4 }}>
                {n.audience} · {n.createdAt}
              </div>
            </div>
            {n.read ? (
              <span className="tag green">已读</span>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  await p1Api.notices.read(n.id);
                  bump();
                  await load();
                }}
              >
                标为已读
              </button>
            )}
          </div>
        ))}
        {notices.length === 0 && <div className="empty">暂无通知</div>}
      </div>
    </div>
  );
}
