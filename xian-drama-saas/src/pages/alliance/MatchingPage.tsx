import { useStore } from "../../store";
import type { MatchNeed } from "../../types";

export default function MatchingPage() {
  const { matches, updateMatch } = useStore();

  return (
    <div className="card">
      <h3>供需撮合看板</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>机构</th>
              <th>需求</th>
              <th>可提供</th>
              <th>负责人</th>
              <th>状态</th>
              <th>更新</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.org}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{m.id}</div>
                </td>
                <td>{m.need}</td>
                <td>{m.offer}</td>
                <td>{m.owner}</td>
                <td>
                  <select
                    value={m.status}
                    onChange={(e) =>
                      updateMatch(m.id, {
                        status: e.target.value as MatchNeed["status"],
                        updatedAt: new Date().toISOString().slice(0, 10),
                      })
                    }
                  >
                    {["开放", "撮合中", "已成交", "关闭"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>{m.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
