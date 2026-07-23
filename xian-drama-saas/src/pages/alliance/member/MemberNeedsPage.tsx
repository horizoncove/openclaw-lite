import { useState } from "react";
import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../utils/memberContext";
import type { MatchNeed } from "../../../types";

export default function MemberNeedsPage() {
  const { user, members, matches, addMatch } = useAllianceStore();
  const org = findMemberOrg(user, members);
  const myMatches = matches.filter((m) => m.org === org?.name);
  const [need, setNeed] = useState("");
  const [offer, setOffer] = useState("");

  const publish = () => {
    if (!org || !need.trim() || !offer.trim()) return;
    const item: MatchNeed = {
      id: `N${String(matches.length + 1).padStart(3, "0")}`,
      org: org.name,
      need: need.trim(),
      offer: offer.trim(),
      status: "开放",
      owner: `${user?.name ?? "联系人"}（待撮合）`,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    addMatch(item);
    setNeed("");
    setOffer("");
  };

  return (
    <div className="member-page">
      <div className="member-card">
        <h3>发布供需信息</h3>
        <p className="member-page-intro" style={{ marginBottom: "1rem" }}>
          填写您的需求与可提供资源，联盟秘书处将协助撮合对接。
        </p>
        <div className="field">
          <label>我需要</label>
          <textarea
            placeholder="例：寻找北美发行渠道与英语配音团队"
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            rows={3}
          />
        </div>
        <div className="field">
          <label>我可提供</label>
          <textarea
            placeholder="例：可提供 2 部已成片都市逆袭题材"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            rows={3}
          />
        </div>
        <button className="btn btn-primary" onClick={publish} disabled={!org}>
          提交发布
        </button>
      </div>

      <div className="member-card" style={{ marginTop: "1rem" }}>
        <h3>我的发布记录</h3>
        {myMatches.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>暂无发布，填写上方表单即可提交。</p>
        ) : (
          myMatches.map((m) => (
            <div className="member-need-item" key={m.id}>
              <div className="member-tags" style={{ marginBottom: 8 }}>
                <span className={`tag ${m.status === "撮合中" ? "amber" : m.status === "已成交" ? "green" : "blue"}`}>
                  {m.status}
                </span>
                <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>更新 {m.updatedAt}</span>
              </div>
              <p>
                <strong>需求：</strong>
                {m.need}
              </p>
              <p>
                <strong>提供：</strong>
                {m.offer}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
