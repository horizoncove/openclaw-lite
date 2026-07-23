import { useState } from "react";
import { Plus } from "lucide-react";
import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../utils/memberContext";
import type { MemberWork, WorkGenre } from "../../../types";

const GENRES: WorkGenre[] = ["甜宠", "逆袭", "古装", "悬疑", "文旅", "都市", "校园"];
const COVERS = ["#f472b6", "#60a5fa", "#c084fc", "#f59e0b", "#34d399", "#64748b", "#22d3ee"];

function WorkCard({ work }: { work: MemberWork }) {
  return (
    <article className="work-card">
      <div className="work-cover" style={{ background: work.coverColor }}>
        <span className="work-genre">{work.genre}</span>
        {work.featured && <span className="work-featured">精选</span>}
      </div>
      <div className="work-body">
        <h4>{work.title}</h4>
        <p className="work-org">{work.org}</p>
        <p className="work-summary">{work.summary}</p>
        <div className="work-meta">
          <span>{work.episodes} 集</span>
          <span className={`tag ${work.status === "热播" ? "green" : work.status === "筹备" ? "amber" : "blue"}`}>
            {work.status}
          </span>
          {work.platform && <span>{work.platform}</span>}
          {work.playCount && <span>播放 {work.playCount}</span>}
        </div>
      </div>
    </article>
  );
}

export default function MemberWorksPage() {
  const { user, members, works, upsertWork } = useAllianceStore();
  const org = findMemberOrg(user, members);
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<WorkGenre>("甜宠");
  const [episodes, setEpisodes] = useState(40);
  const [summary, setSummary] = useState("");

  const list = filter === "mine" && org ? works.filter((w) => w.org === org.name) : works;

  const submit = () => {
    if (!org || !title.trim() || !summary.trim()) return;
    const work: MemberWork = {
      id: `W${String(works.length + 1).padStart(3, "0")}`,
      org: org.name,
      title: title.trim(),
      genre,
      episodes,
      status: "筹备",
      coverColor: COVERS[works.length % COVERS.length],
      summary: summary.trim(),
      featured: false,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    upsertWork(work);
    setTitle("");
    setSummary("");
    setShowForm(false);
  };

  return (
    <div className="member-page">
      <div className="member-card showcase-toolbar">
        <div>
          <h3>会员作品展示</h3>
          <p className="member-page-intro" style={{ margin: 0 }}>
            浏览联盟会员短剧作品库，展示企业创作实力与播出成绩。
          </p>
        </div>
        <div className="showcase-actions">
          <div className="token-filter-tabs">
            <button className={filter === "all" ? "active" : undefined} onClick={() => setFilter("all")} type="button">
              全部作品 ({works.length})
            </button>
            <button className={filter === "mine" ? "active" : undefined} onClick={() => setFilter("mine")} type="button">
              我的作品 ({org ? works.filter((w) => w.org === org.name).length : 0})
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} disabled={!org}>
            <Plus size={15} /> 上传作品
          </button>
        </div>
      </div>

      {showForm && (
        <div className="member-card" style={{ marginTop: "1rem" }}>
          <h3>添加作品信息</h3>
          <div className="grid grid-2">
            <div className="field">
              <label>作品名称</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：长安甜宠日记" />
            </div>
            <div className="field">
              <label>题材</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value as WorkGenre)}>
                {GENRES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>集数</label>
              <input type="number" value={episodes} onChange={(e) => setEpisodes(Number(e.target.value))} />
            </div>
          </div>
          <div className="field">
            <label>作品简介</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </div>
          <button className="btn btn-primary" onClick={submit}>
            提交展示
          </button>
        </div>
      )}

      <div className="work-grid">
        {list.map((w) => (
          <WorkCard key={w.id} work={w} />
        ))}
      </div>
    </div>
  );
}
