import { BookOpen, CheckCircle2, CircleDashed } from "lucide-react";

type Step = {
  title: string;
  owner: string;
  entry: string;
  points: string[];
  status: "已落地" | "SOP 设计";
};

const PHASES: { name: string; summary: string; steps: Step[] }[] = [
  {
    name: "1. 登记入会",
    summary: "机构进名册、定级、开通企业钱包，才具备发布与成交资格。",
    steps: [
      {
        title: "提交机构档案",
        owner: "申请机构 → 秘书处录入",
        entry: "/alliance/console/members",
        points: ["名称/类型/城市/联系人/标签齐全", "状态先「待审」"],
        status: "已落地",
      },
      {
        title: "审核定级并开通钱包",
        owner: "秘书处",
        entry: "会员管理 + orgWallets",
        points: ["核心/专业/观察会员", "改为「有效」后方可撮合", "演示环境种子已预置余额"],
        status: "已落地",
      },
    ],
  },
  {
    name: "2. 购买 / 补充 Token",
    summary: "机构 Token 用于托管成交；中心 Token 是产能燃料——两层不要混。",
    steps: [
      {
        title: "会员补充机构额度",
        owner: "需求方会员",
        entry: "/alliance/member/deals",
        points: ["看清可用 / 锁定", "一键补充 50k", "成交前余额须盖过机制首冻额"],
        status: "已落地",
      },
      {
        title: "中心购买套餐",
        owner: "中心专员",
        entry: "/center/console/tokens",
        points: ["选套餐演示入账", "模型目录与 API Key", "与 Deal 托管账本隔离"],
        status: "已落地",
      },
    ],
  },
  {
    name: "3. 发布 · 应征 · 支付机制",
    summary: "买方设机制；供方可应征接受或要求改条款。",
    steps: [
      {
        title: "发布供需并设定机制",
        owner: "需求方",
        entry: "/alliance/member/needs",
        points: ["预付 / 过程支付 / 验收后支付", "可写机制说明"],
        status: "已落地",
      },
      {
        title: "供应方应征",
        owner: "供给方",
        entry: "同页「应征开放供需」",
        points: ["接受原机制或要求变更", "填写理由；可撤回待审应征"],
        status: "已落地",
      },
    ],
  },
  {
    name: "4. 撮合签注与托管",
    summary: "秘书处背书对手方、场景包与最终机制，冻结对价。",
    steps: [
      {
        title: "签注检查后成交",
        owner: "秘书处",
        entry: "/alliance/console/matching",
        points: [
          "勾选：双方有效、场景匹配、机制谈拢、余额足够",
          "路径 A：采纳应征并成交",
          "路径 B：手动选供给方/机制后开预算",
        ],
        status: "已落地",
      },
      {
        title: "双边确认与冻结",
        owner: "系统 / 双方",
        entry: "Deal confirm + escrow",
        points: ["演示常自动确认", "预付/验收后冻 100%；过程冻 40%", "无托管不履约扣费"],
        status: "已落地",
      },
    ],
  },
  {
    name: "5. 中心履约",
    summary: "按里程碑干活，从托管池燃烧并三拆。",
    steps: [
      {
        title: "认领工单并节点消耗",
        owner: "五大中心",
        entry: "中心工单；演示用 /alliance/console/loop",
        points: [
          "审批预检 · 出海译制 · 投流冷启动 · AI 产线 · 版权案件",
          "每次消耗 = 撮合费 + 供给激励 + 中心保留",
          "验收后支付：费/激励进暂挂",
        ],
        status: "已落地",
      },
    ],
  },
  {
    name: "6. 确权与登记辅导",
    summary: "版权中心建立可出示的权属与登记路径。",
    steps: [
      {
        title: "立案与类型选择",
        owner: "版权中心",
        entry: "中心版权案件",
        points: ["确权 / 登记辅导 / 授权 / 维权", "收件：权利人、作品说明、权属证明"],
        status: "已落地",
      },
      {
        title: "核验意见与登记辅导",
        owner: "版权中心",
        entry: "案件推进",
        points: [
          "形式审查 → 权属核验意见（文书模板见 docs/SOP.md）",
          "登记辅导：材料清单、渠道指引、进度回传",
          "复杂权属可转介外官登记",
        ],
        status: "SOP 设计",
      },
    ],
  },
  {
    name: "7. 验收 · 结算 · 仲裁",
    summary: "对照标的验收；结算退回剩余；争议由秘书处主持。",
    steps: [
      {
        title: "验收与结算",
        owner: "买方 + 秘书处",
        entry: "/alliance/console/loop",
        points: ["对照 consideration / 里程碑", "结算释放暂挂激励", "未用托管退回买方"],
        status: "已落地",
      },
      {
        title: "争议仲裁",
        owner: "秘书处主持",
        entry: "联盟工单标题加【争议】",
        points: [
          "提起 → 立案暂停消耗 → 调解 → 裁决 → 按流水执行",
          "以 ledger 为准，口头不对抗流水",
          "下迭代独立 Dispute 实体（见 docs/SOP.md §9）",
        ],
        status: "SOP 设计",
      },
    ],
  },
];

export default function SopGuidePage() {
  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="loop-hero broker">
        <div>
          <p className="loop-eyebrow">SOP · 标准作业</p>
          <h3>从入会登记到仲裁结案：每一步谁做、在哪做、怎样算过</h3>
          <p>
            本页是运营速查。完整条款、材料清单、RACI 与 SLA 见仓库
            <code style={{ marginLeft: 6 }}>docs/SOP.md</code>。
          </p>
        </div>
        <div className="loop-hero-stats">
          <div>
            <strong>9</strong>
            <span>主阶段</span>
          </div>
          <div>
            <strong>双层</strong>
            <span>Token 账本</span>
          </div>
          <div>
            <strong>3</strong>
            <span>支付机制</span>
          </div>
        </div>
      </section>

      <div className="card">
        <h3>
          <BookOpen size={18} style={{ marginRight: 8, verticalAlign: -3 }} />
          泳道一览
        </h3>
        <div className="tx-pipeline" style={{ marginTop: "0.75rem" }}>
          {["登记", "购 Token", "发布应征", "签注托管", "中心履约", "确权", "验收结算", "仲裁"].map((p) => (
            <div className="tx-pipeline-step" key={p}>
              <strong>{p}</strong>
            </div>
          ))}
        </div>
      </div>

      {PHASES.map((phase) => (
        <div className="card" key={phase.name}>
          <h3>{phase.name}</h3>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>{phase.summary}</p>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
            {phase.steps.map((s) => (
              <article
                key={s.title}
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: "0.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong>{s.title}</strong>
                  <span className={`tag ${s.status === "已落地" ? "green" : "amber"}`}>
                    {s.status === "已落地" ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}{" "}
                    {s.status}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
                  主责：{s.owner} · 入口：{s.entry}
                </div>
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
                  {s.points.map((p) => (
                    <li key={p} style={{ fontSize: "0.9rem" }}>
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <h3>签注检查清单（成交前）</h3>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.1rem" }}>
          <li>双方均为有效会员</li>
          <li>场景包与需求匹配</li>
          <li>支付机制已谈拢（采纳应征或协商）</li>
          <li>买方余额 ≥ 机制首冻金额</li>
          <li>无未结重大争议</li>
        </ul>
      </div>
    </div>
  );
}
