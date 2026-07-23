import { useState } from "react";
import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../lib/memberContext";

export default function MemberProfilePage() {
  const { user, members, upsertMember } = useAllianceStore();
  const org = findMemberOrg(user, members);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(org?.phone ?? "");

  if (!org) {
    return (
      <div className="member-card">
        <h3>未找到企业档案</h3>
        <p style={{ color: "var(--muted)" }}>
          演示账号「王敏」对应机构「长安映缔影视」。如为其他企业，请联系联盟秘书处完成入会绑定。
        </p>
      </div>
    );
  }

  const save = () => {
    upsertMember({ ...org, phone });
    setEditing(false);
  };

  return (
    <div className="member-page">
      <div className="member-profile-card">
        <div className="member-profile-head">
          <div>
            <p className="member-hero-label">会员档案</p>
            <h3>{org.name}</h3>
            <p className="member-hero-desc">会员编号 {org.id} · 入会 {org.joinedAt}</p>
          </div>
          <span className={`tag ${org.status === "有效" ? "green" : "amber"}`}>{org.status}</span>
        </div>

        <div className="member-profile-grid">
          <div>
            <label>会员层级</label>
            <strong>{org.tier}</strong>
          </div>
          <div>
            <label>机构类型</label>
            <strong>{org.type}</strong>
          </div>
          <div>
            <label>所在城市</label>
            <strong>{org.city}</strong>
          </div>
          <div>
            <label>联系人</label>
            <strong>{org.contact}</strong>
          </div>
          <div>
            <label>联系电话</label>
            {editing ? (
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            ) : (
              <strong>{org.phone}</strong>
            )}
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: "0.85rem" }}>
            能力标签
          </label>
          <div className="member-tags">
            {org.tags.map((t) => (
              <span className="tag gray" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="member-benefits">
          <h4>会员权益（演示）</h4>
          <ul>
            <li>参与联盟供需对接会与路演活动</li>
            <li>发布供需信息，由秘书处撮合</li>
            <li>优先获取政策与产业资讯</li>
            <li>申请联盟秘书处协调服务</li>
          </ul>
        </div>

        <div style={{ marginTop: "1rem" }}>
          {editing ? (
            <>
              <button className="btn btn-primary" onClick={save}>
                保存联系方式
              </button>
              <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setEditing(false)}>
                取消
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              更新联系电话
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
