import { useState } from "react";
import { Check, Copy, KeyRound, RefreshCw, Zap } from "lucide-react";
import { useCenterStore } from "../../store/centerStore";

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function TokenHubPage() {
  const { tokenModels, tokenPackages, tokenWallet, purchaseTokens, regenerateApiKey, apiOnline } =
    useCenterStore();
  const [copied, setCopied] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const copyKey = async () => {
    await navigator.clipboard.writeText(tokenWallet.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onPurchase = async (packageId: string) => {
    setBuying(packageId);
    try {
      await purchaseTokens(packageId);
    } finally {
      setBuying(null);
    }
  };

  const filteredModels =
    filter === "all" ? tokenModels : tokenModels.filter((m) => m.category === filter);

  const usagePct = Math.min(
    100,
    Math.round((tokenWallet.usedThisMonth / Math.max(tokenWallet.monthlyQuota, 1)) * 100),
  );

  return (
    <div className="token-hub">
      <section className="token-hero">
        <div>
          <p className="token-eyebrow">XD-ROUTER · API 聚合网关</p>
          <h3>标准化 Token 购买与模型路由</h3>
          <p>
            参考 OpenRouter 统一接入多家大模型，按 Token 计费、统一 API Key、五大中心共享额度。
          </p>
        </div>
        <div className="token-balance-card">
          <span>可用余额</span>
          <strong>{tokenWallet.balance.toLocaleString()}</strong>
          <small>Tokens</small>
          <div className="token-usage-bar">
            <div className="token-usage-fill" style={{ width: `${usagePct}%` }} />
          </div>
          <span className="token-usage-label">
            本月 {formatTokens(tokenWallet.usedThisMonth)} / {formatTokens(tokenWallet.monthlyQuota)}
          </span>
        </div>
      </section>

      <div className="card token-api-card">
        <div className="token-api-head">
          <KeyRound size={18} />
          <div>
            <strong>统一 API Key</strong>
            <p>接入地址 <code>https://api.xian-drama.center/v1/chat/completions</code></p>
          </div>
        </div>
        <div className="token-api-row">
          <code className="token-api-key">{tokenWallet.apiKey}</code>
          <button className="btn btn-secondary" onClick={copyKey}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "已复制" : "复制"}
          </button>
          <button className="btn btn-ghost" onClick={() => regenerateApiKey()} disabled={!apiOnline}>
            <RefreshCw size={15} /> 轮换密钥
          </button>
        </div>
      </div>

      <div className="token-packages">
        <h3>购买 Token 套餐</h3>
        <div className="token-package-grid">
          {tokenPackages.map((pkg) => (
            <article
              className={`token-package-card ${pkg.popular ? "popular" : ""}`}
              key={pkg.id}
            >
              {pkg.popular && <span className="token-popular-badge">推荐</span>}
              <h4>{pkg.name}</h4>
              <div className="token-package-price">
                ¥{pkg.price}
                <span>/ {(pkg.tokens / 1000).toFixed(0)}k Tokens</span>
              </div>
              {pkg.bonus > 0 && (
                <p className="token-package-bonus">+ 赠送 {pkg.bonus.toLocaleString()} Tokens</p>
              )}
              <p>{pkg.desc}</p>
              <button
                className="btn btn-primary"
                onClick={() => onPurchase(pkg.id)}
                disabled={buying === pkg.id}
              >
                <Zap size={15} />
                {buying === pkg.id ? "处理中…" : "立即购买"}
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="token-model-toolbar">
          <h3>模型路由目录</h3>
          <div className="token-filter-tabs">
            {[
              ["all", "全部"],
              ["chat", "对话"],
              ["embedding", "向量"],
              ["video", "视频"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={filter === id ? "active" : undefined}
                onClick={() => setFilter(id)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>模型 ID</th>
                <th>提供商</th>
                <th>类型</th>
                <th>输入 ¥/1M</th>
                <th>输出 ¥/1M</th>
                <th>上下文</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.id}</strong>
                    <div className="token-model-tags">
                      {m.tags.map((t) => (
                        <span className="tag gray" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{m.provider}</td>
                  <td>{m.category}</td>
                  <td>{m.inputPrice.toFixed(1)}</td>
                  <td>{m.outputPrice > 0 ? m.outputPrice.toFixed(1) : "—"}</td>
                  <td>{m.contextWindow > 0 ? `${(m.contextWindow / 1000).toFixed(0)}k` : "—"}</td>
                  <td>
                    <span
                      className={`tag ${
                        m.status === "可用" ? "green" : m.status === "限流" ? "amber" : "red"
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>账单与流水</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>流水号</th>
                <th>类型</th>
                <th>变动</th>
                <th>余额</th>
                <th>说明</th>
                <th>日期</th>
              </tr>
            </thead>
            <tbody>
              {tokenWallet.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>
                    <span className={`tag ${tx.type === "充值" ? "green" : "amber"}`}>{tx.type}</span>
                  </td>
                  <td>
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount.toLocaleString()}
                  </td>
                  <td>{tx.balance.toLocaleString()}</td>
                  <td>
                    {tx.note}
                    {tx.model && (
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{tx.model}</div>
                    )}
                  </td>
                  <td>{tx.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
