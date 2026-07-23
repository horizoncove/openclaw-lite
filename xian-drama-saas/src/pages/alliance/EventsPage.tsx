import { useState } from "react";
import { useStore } from "../../store";
import type { EventItem } from "../../types";

export default function EventsPage() {
  const { events, addEvent } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<EventItem>>({
    type: "对接会",
    status: "筹备",
    capacity: 80,
    enrolled: 0,
  });

  const create = () => {
    if (!form.title || !form.date || !form.place) return;
    addEvent({
      id: `E${String(events.length + 1).padStart(3, "0")}`,
      title: form.title!,
      date: form.date!,
      place: form.place!,
      type: (form.type as EventItem["type"]) || "对接会",
      status: (form.status as EventItem["status"]) || "筹备",
      capacity: Number(form.capacity || 80),
      enrolled: Number(form.enrolled || 0),
    });
    setOpen(false);
  };

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <div className="toolbar">
          <h3 style={{ margin: 0, flex: 1 }}>活动运营</h3>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            创建活动
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>活动</th>
                <th>类型</th>
                <th>时间/地点</th>
                <th>报名</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.title}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{e.id}</div>
                  </td>
                  <td>
                    <span className="tag blue">{e.type}</span>
                  </td>
                  <td>
                    {e.date}
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{e.place}</div>
                  </td>
                  <td>
                    {e.enrolled}/{e.capacity}
                  </td>
                  <td>
                    <span className={`tag ${e.status === "报名中" ? "green" : "gray"}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>创建活动</h3>
            <div className="field">
              <label>标题</label>
              <input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="field">
              <label>日期</label>
              <input type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <label>地点</label>
              <input value={form.place || ""} onChange={(e) => setForm({ ...form, place: e.target.value })} />
            </div>
            <div className="field">
              <label>类型</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EventItem["type"] })}
              >
                {["对接会", "路演", "培训", "联席会"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={create}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
