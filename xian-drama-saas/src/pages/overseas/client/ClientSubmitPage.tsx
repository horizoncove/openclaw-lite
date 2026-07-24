import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useOverseasStore } from "../../../store/overseasStore";
import type { IntakeRequest } from "../../../types";

export default function ClientSubmitPage() {
  const { user, saveIntake } = useOverseasStore();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [market, setMarket] = useState("北美");
  const [need, setNeed] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !need.trim()) return;
    setSaving(true);
    const item: IntakeRequest = {
      id: `IN-${Date.now().toString().slice(-4)}`,
      org: user?.org || "未知机构",
      contact: user?.name || "联系人",
      title: title.trim(),
      market,
      need: need.trim(),
      status: "新建",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    await saveIntake(item);
    setSaving(false);
    nav("/overseas/client");
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h3>提交出海需求</h3>
      <p className="member-page-intro">运营团队将评估市场适配度，并反馈是否立项。</p>
      <form onSubmit={submit}>
        <div className="field">
          <label>需求标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：《新剧名》北美发行诊断"
            required
          />
        </div>
        <div className="field">
          <label>目标市场</label>
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            {["北美", "东南亚", "中东", "拉美", "欧洲"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>需求说明</label>
          <textarea
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder="说明成片状态、语言、期望平台或服务类型"
            required
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => nav(-1)}>
            取消
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "提交中…" : "提交进件"}
          </button>
        </div>
      </form>
    </div>
  );
}
