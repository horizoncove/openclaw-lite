import { useMemo, useState } from "react";
import { useStore } from "../../store";
import type { Member, MemberStatus, MemberTier } from "../../types";

export default function MembersPage() {
  const { members, upsertMember } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Member>>({
    tier: "专业会员",
    type: "制作",
    status: "待审",
    city: "西安",
    tags: [],
  });

  const list = useMemo(
    () =>
      members.filter(
        (m) =>
          !q ||
          m.name.includes(q) ||
          m.contact.includes(q) ||
          m.tags.some((t) => t.includes(q)),
      ),
    [members, q],
  );

  const save = () => {
    if (!form.name || !form.contact) return;
    const id = form.id || `M${String(members.length + 1).padStart(3, "0")}`;
    upsertMember({
      id,
      name: form.name!,
      tier: (form.tier as MemberTier) || "观察会员",
      type: form.type || "其他",
      tags: form.tags?.length ? form.tags : ["待完善"],
      contact: form.contact!,
      phone: form.phone || "待补充",
      status: (form.status as MemberStatus) || "待审",
      joinedAt: form.joinedAt || new Date().toISOString().slice(0, 10),
      city: form.city || "西安",
    });
    setOpen(false);
  };

  return (
    <div className="card">
      <div className="toolbar">
        <input placeholder="搜索会员/联系人/标签" value={q} onChange={(e) => setQ(e.target.value)} />
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({
              tier: "专业会员",
              type: "制作",
              status: "待审",
              city: "西安",
              tags: [],
            });
            setOpen(true);
          }}
        >
          新增会员
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>会员</th>
              <th>层级</th>
              <th>类型/标签</th>
              <th>联系人</th>
              <th>状态</th>
              <th>入会</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {m.id} · {m.city}
                  </div>
                </td>
                <td>
                  <span className="tag">{m.tier}</span>
                </td>
                <td>
                  {m.type}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {m.tags.map((t) => (
                      <span className="tag gray" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  {m.contact}
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{m.phone}</div>
                </td>
                <td>
                  <span
                    className={`tag ${m.status === "有效" ? "green" : m.status === "待审" ? "amber" : "gray"}`}
                  >
                    {m.status}
                  </span>
                </td>
                <td>{m.joinedAt}</td>
                <td>
                  <select
                    value={m.status}
                    onChange={(e) => upsertMember({ ...m, status: e.target.value as MemberStatus })}
                  >
                    {["有效", "待审", "退出"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>新增 / 编辑会员</h3>
            <div className="field">
              <label>机构名称</label>
              <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>层级</label>
              <select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value as MemberTier })}
              >
                {["核心会员", "专业会员", "观察会员"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>类型</label>
              <input value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </div>
            <div className="field">
              <label>联系人</label>
              <input value={form.contact || ""} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div className="field">
              <label>电话</label>
              <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>标签（逗号分隔）</label>
              <input
                value={(form.tags || []).join(",")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tags: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={save}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
