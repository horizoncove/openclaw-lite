import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { p1Api } from "../../api/p1Client";
import { useP1Store } from "../../store/p1Store";

type QueueItem = {
  id: string;
  title?: string;
  signal: string;
  severity: string;
  orgName?: string;
  publisherOrg?: string;
  applicantOrg?: string;
  dueAt?: string;
  message?: string;
  error?: string;
};

type Supervision = {
  generatedAt: string;
  flywheel: {
    score: number;
    openDemands: number;
    pendingApplications: number;
    deals: number;
    escrowedOrders: number;
    releasedOrders: number;
    disputedOrders: number;
  };
  queues: {
    pendingConfirm: QueueItem[];
    silentDemands: QueueItem[];
    disputedOrders: QueueItem[];
    overdueTasks: QueueItem[];
    failedJobs: QueueItem[];
  };
  capacity: {
    activeJobs: number;
    failedJobs: number;
    memberOrgCount: number;
    totalWalletBalance: number;
    totalUsedThisMonth: number;
  };
  guardrails: {
    tokenResaleEnabled: boolean;
    peerTransferEnabled: boolean;
    freeFxEnabled: boolean;
    purchasedRedeemEnabled: boolean;
    notes: string[];
  };
  actions: { id: string; label: string; href: string; count: number }[];
  northStar: { matchCompatibility: string; trustGuarantee: string };
};

function scoreTone(score: number) {
  if (score >= 75) return "good";
  if (score >= 50) return "mid";
  return "low";
}

function QueueList({
  title,
  items,
  empty,
}: {
  title: string;
  items: QueueItem[];
  empty: string;
}) {
  return (
    <section className="sup-panel">
      <header className="sup-panel-head">
        <h3>{title}</h3>
        <span className="sup-count">{items.length}</span>
      </header>
      {items.length === 0 ? (
        <p className="sup-empty">{empty}</p>
      ) : (
        <ul className="sup-queue">
          {items.map((item) => (
            <li key={item.id} className={`sup-queue-item sev-${item.severity}`}>
              <div>
                <strong>{item.title || item.id}</strong>
                <p>
                  {[item.publisherOrg, item.applicantOrg, item.orgName, item.message, item.error]
                    .filter(Boolean)
                    .join(" · ")}
                  {item.dueAt ? ` · 截止 ${item.dueAt}` : ""}
                </p>
              </div>
              <span className="sup-signal">{item.signal}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function SupervisionPage() {
  const { user, refreshFlag } = useP1Store();
  const [data, setData] = useState<Supervision | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    p1Api
      .supervision()
      .then((d) => {
        setData(d as Supervision);
        setError(null);
      })
      .catch((e: Error) => {
        setData(null);
        setError(e.message || "无法加载监督视角");
      });
  }, [refreshFlag]);

  if (user?.role !== "secretariat" && user?.role !== "ops") {
    return (
      <div className="card empty">
        监督视角仅对联盟秘书处 / 运维开放。请使用演示账号「陈希」或「韩磊」登录。
      </div>
    );
  }

  if (error) return <div className="card empty">{error}</div>;
  if (!data) return <div className="card empty">加载监管仪表盘…</div>;

  const { flywheel, queues, capacity, guardrails, actions, northStar } = data;
  const tone = scoreTone(flywheel.score);

  return (
    <div className="sup-root">
      <section className="sup-hero">
        <div>
          <p className="sup-eyebrow">REGULATOR VIEW · 监管监督视角</p>
          <h2>主飞轮健康与待介入队列</h2>
          <p className="sup-lead">
            盯住两根柱子：<strong>{northStar.matchCompatibility}</strong> 与{" "}
            <strong>{northStar.trustGuarantee}</strong>
            。先处理高亮队列，再看产能与护栏。
          </p>
        </div>
        <div className={`sup-score sup-score-${tone}`}>
          <div className="sup-score-wrap">
            <div
              className="sup-score-ring"
              style={{ ["--score" as string]: String(flywheel.score) }}
              aria-hidden
            />
            <span className="sup-score-num">{flywheel.score}</span>
          </div>
          <p>主轮健康分</p>
        </div>
      </section>

      <section className="sup-pillars">
        <article>
          <h3>适配保障</h3>
          <div className="sup-metric-row">
            <div>
              <strong>{flywheel.openDemands}</strong>
              <span>开放需求</span>
            </div>
            <div>
              <strong>{flywheel.pendingApplications}</strong>
              <span>待确认应征</span>
            </div>
            <div>
              <strong>{queues.silentDemands.length}</strong>
              <span>无应征需求</span>
            </div>
          </div>
        </article>
        <article>
          <h3>信任保障</h3>
          <div className="sup-metric-row">
            <div>
              <strong>{flywheel.deals}</strong>
              <span>成交痕迹</span>
            </div>
            <div>
              <strong>{flywheel.escrowedOrders}</strong>
              <span>托管中</span>
            </div>
            <div>
              <strong>{flywheel.disputedOrders}</strong>
              <span>争议单</span>
            </div>
          </div>
        </article>
        <article>
          <h3>产能与会员</h3>
          <div className="sup-metric-row">
            <div>
              <strong>{capacity.activeJobs}</strong>
              <span>活跃作业</span>
            </div>
            <div>
              <strong>{capacity.failedJobs}</strong>
              <span>失败作业</span>
            </div>
            <div>
              <strong>{capacity.memberOrgCount}</strong>
              <span>会员机构</span>
            </div>
          </div>
        </article>
      </section>

      <section className="sup-actions">
        {actions.map((a) => (
          <Link key={a.id} className="sup-action" to={a.href}>
            <span>{a.label}</span>
            {a.count > 0 ? <em>{a.count}</em> : <em className="zero">0</em>}
          </Link>
        ))}
      </section>

      <div className="sup-grid">
        <QueueList
          title="待确认成交（信任闸口）"
          items={queues.pendingConfirm}
          empty="暂无待确认应征 — 适配侧安静或已消化"
        />
        <QueueList
          title="无应征需求（适配干旱）"
          items={queues.silentDemands}
          empty="开放需求均有应征"
        />
        <QueueList
          title="争议订单"
          items={queues.disputedOrders}
          empty="无争议（订单托管上线后在此汇聚）"
        />
        <QueueList title="全网逾期任务" items={queues.overdueTasks} empty="无逾期任务" />
        <QueueList title="失败算力作业" items={queues.failedJobs} empty="无失败作业" />

        <section className="sup-panel">
          <header className="sup-panel-head">
            <h3>护栏状态（不可关闭）</h3>
          </header>
          <ul className="sup-rails">
            <li className={!guardrails.tokenResaleEnabled ? "on" : "off"}>
              Token 挂单转售：{guardrails.tokenResaleEnabled ? "异常开启" : "已关闭"}
            </li>
            <li className={!guardrails.peerTransferEnabled ? "on" : "off"}>
              会员互转余额：{guardrails.peerTransferEnabled ? "异常开启" : "已关闭"}
            </li>
            <li className={!guardrails.freeFxEnabled ? "on" : "off"}>
              浮动汇率兑换所：{guardrails.freeFxEnabled ? "异常开启" : "已关闭"}
            </li>
            <li className={!guardrails.purchasedRedeemEnabled ? "on" : "off"}>
              购入桶兑出：{guardrails.purchasedRedeemEnabled ? "异常开启" : "已关闭"}
            </li>
          </ul>
          <ul className="sup-notes">
            {guardrails.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="sup-wallet-hint">
            本月用量合计 {capacity.totalUsedThisMonth.toLocaleString()} T · 钱包余额合计{" "}
            {capacity.totalWalletBalance.toLocaleString()} T
          </p>
        </section>
      </div>
    </div>
  );
}
