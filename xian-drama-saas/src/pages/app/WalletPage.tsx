import { useEffect, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { p1Api } from "../../api/p1Client";
import { useP1Store } from "../../store/p1Store";
import type { P1LedgerEntry, P1Model, P1Package, P1Wallet } from "../../p1/types";

export default function WalletPage() {
  const { bump, refreshFlag, user } = useP1Store();
  const [wallet, setWallet] = useState<P1Wallet | null>(null);
  const [ledger, setLedger] = useState<P1LedgerEntry[]>([]);
  const [packages, setPackages] = useState<P1Package[]>([]);
  const [models, setModels] = useState<P1Model[]>([]);
  const [copied, setCopied] = useState(false);
  const [chatOut, setChatOut] = useState("");
  const [prompt, setPrompt] = useState("帮我写一段北美女频短剧的三集钩子大纲");
  const [model, setModel] = useState("deepseek-chat");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const data = await p1Api.wallet.get();
    setWallet(data.wallet);
    setLedger(data.ledger);
    setPackages(data.packages);
    setModels(data.models);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [refreshFlag]);

  if (!user?.orgId) {
    return <div className="card empty">秘书处/运营账号无机构钱包，请切换会员机构账号。</div>;
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="token-hero">
        <div>
          <p className="token-eyebrow">XD-ROUTER · API 聚合</p>
          <h3>统一模型网关与机构钱包</h3>
          <p>OpenAI 兼容协议，按量扣费。不做额度转售。可对接算力作业队列。</p>
        </div>
        <div className="token-balance-card">
          <span>可用余额</span>
          <strong>{wallet?.balance?.toLocaleString() ?? "—"}</strong>
          <small>Tokens</small>
          <span className="token-usage-label">
            本月已用 {wallet?.usedThisMonth?.toLocaleString() ?? 0}
          </span>
        </div>
      </section>

      <div className="card token-api-card">
        <div className="token-api-head">
          <KeyRound size={18} />
          <div>
            <strong>统一 API Key</strong>
            <p>
              调用 <code>POST /v1/chat/completions</code>
            </p>
          </div>
        </div>
        <div className="token-api-row">
          <code className="token-api-key">{wallet?.apiKey}</code>
          <button
            className="btn btn-secondary"
            onClick={async () => {
              if (!wallet) return;
              await navigator.clipboard.writeText(wallet.apiKey);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "已复制" : "复制"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              const { apiKey } = await p1Api.wallet.rotateKey();
              setWallet((w) => (w ? { ...w, apiKey } : w));
              bump();
            }}
          >
            轮换密钥
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>购买套餐（官方充值）</h3>
          <div className="os-platform-grid" style={{ gridTemplateColumns: "1fr" }}>
            {packages.map((p) => (
              <div key={p.id} className="list-row">
                <div>
                  <strong>
                    {p.name} {p.popular ? "· 推荐" : ""}
                  </strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                    {(p.tokens + p.bonus).toLocaleString()} tokens · ¥{p.price} · {p.desc}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    await p1Api.wallet.purchase(p.id);
                    bump();
                    await load();
                  }}
                >
                  购买
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>试调用聚合网关</h3>
          <div className="field">
            <label>模型</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {models
                .filter((m) => m.modality === "chat")
                .map((m) => (
                  <option key={m.id} value={m.modelKey}>
                    {m.name} ({m.provider})
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label>提示词</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <button
            className="btn btn-primary"
            disabled={busy || !wallet}
            onClick={async () => {
              if (!wallet) return;
              setBusy(true);
              setChatOut("");
              try {
                const res = await fetch("/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${wallet.apiKey}`,
                  },
                  body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: prompt }],
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || "调用失败");
                setChatOut(data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2));
                bump();
                await load();
              } catch (e) {
                setChatOut(e instanceof Error ? e.message : String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "调用中…" : "发送并计费"}
          </button>
          {chatOut && (
            <pre
              style={{
                marginTop: "0.75rem",
                whiteSpace: "pre-wrap",
                background: "#f8fafc",
                padding: "0.75rem",
                borderRadius: 8,
                fontSize: "0.85rem",
              }}
            >
              {chatOut}
            </pre>
          )}
        </div>
      </div>

      <div className="card">
        <h3>模型目录</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>模型</th>
                <th>供应商</th>
                <th>模态</th>
                <th>输入/输出价</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.name}</strong>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{m.modelKey}</div>
                  </td>
                  <td>{m.provider}</td>
                  <td>{m.modality}</td>
                  <td>
                    {m.inputPrice} / {m.outputPrice}
                  </td>
                  <td>
                    <span className="tag green">{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>账本流水</h3>
        {ledger.map((l) => (
          <div className="list-row" key={l.id}>
            <div>
              <strong>
                {l.type} {l.amount > 0 ? "+" : ""}
                {l.amount.toLocaleString()}
              </strong>
              <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{l.note}</div>
            </div>
            <span>余额 {l.balance.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
