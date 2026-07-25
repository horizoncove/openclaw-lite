import { useAllianceStore } from "../../../store/allianceStore";
import { findMemberOrg } from "../../../utils/memberContext";

export default function MemberEventsPage() {
  const { user, members, events, updateEvent } = useAllianceStore();
  const org = findMemberOrg(user, members);

  const enroll = (id: string) => {
    const e = events.find((x) => x.id === id);
    if (!e || e.status === "已结束" || e.enrolled >= e.capacity) return;
    updateEvent(id, {
      enrolled: e.enrolled + 1,
      status: e.status === "筹备" ? "报名中" : e.status,
    });
  };

  return (
    <div className="member-page">
      <p className="member-page-intro">浏览联盟活动并在线报名。秘书处发布的活动将在此展示。</p>
      <div className="member-event-grid">
        {events.map((e) => {
          const full = e.enrolled >= e.capacity;
          const closed = e.status === "已结束";
          return (
            <article className="member-event-card" key={e.id}>
              <span className={`tag ${e.status === "报名中" ? "green" : "gray"}`}>{e.status}</span>
              <h3>{e.title}</h3>
              <p className="member-event-meta">{e.type}</p>
              <p className="member-event-meta">📅 {e.date}</p>
              <p className="member-event-meta">📍 {e.place}</p>
              <div className="member-event-cap">
                报名 {e.enrolled}/{e.capacity}
              </div>
              <button
                className="btn btn-primary"
                disabled={closed || full}
                onClick={() => enroll(e.id)}
              >
                {closed ? "已结束" : full ? "名额已满" : `为 ${org?.name ?? "本企业"} 报名`}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
