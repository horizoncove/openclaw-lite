import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type WorkRole = "client" | "supplier";

export type WorkUser = {
  id: string;
  name: string;
  org: string;
  role: WorkRole;
};

export type Bounty = {
  id: string;
  title: string;
  summary: string;
  category: string;
  budgetT: number;
  deadline: string;
  clientOrg: string;
  status: "open" | "matched" | "done";
  applicants: { id: string; name: string; org: string; note: string }[];
  selectedApplicantId?: string;
  orderId?: string;
};

export type Order = {
  id: string;
  bountyId: string;
  title: string;
  budgetT: number;
  clientOrg: string;
  supplierOrg: string;
  supplierName: string;
  status: "escrowed" | "in_progress" | "paid";
  frozenT: number;
  paidT?: number;
};

export type LedgerRow = {
  id: string;
  at: string;
  label: string;
  delta: number;
  role: WorkRole | "system";
};

export type ChatMsg = {
  id: string;
  from: "agent" | "user" | "system";
  text: string;
};

type WorkState = {
  user: WorkUser | null;
  balance: number;
  frozen: number;
  bounties: Bounty[];
  orders: Order[];
  ledger: LedgerRow[];
  messages: ChatMsg[];
  pendingConfirm:
    | null
    | { type: "buy"; amountT: number; cny: number }
    | { type: "match"; bountyId: string; applicantId: string }
    | { type: "accept"; orderId: string };
};

type WorkContextValue = WorkState & {
  login: (user: WorkUser) => void;
  logout: () => void;
  pushUserMsg: (text: string) => void;
  askAgent: (text: string) => void;
  requestBuy: (amountT: number) => void;
  confirmPending: () => void;
  cancelPending: () => void;
  publishBounty: (input: {
    title: string;
    summary: string;
    category: string;
    budgetT: number;
    deadline: string;
  }) => void;
  applyBounty: (bountyId: string, note: string) => void;
  requestMatch: (bountyId: string, applicantId: string) => void;
  markDelivered: (orderId: string) => void;
  requestAccept: (orderId: string) => void;
  resetDemo: () => void;
};

const USERS: WorkUser[] = [
  { id: "u-client", name: "王敏", org: "长安短剧工作室", role: "client" },
  { id: "u-supplier", name: "马川", org: "丝路译制工坊", role: "supplier" },
];

const FEE_RATE = 0.05;

function seedBounties(): Bounty[] {
  return [
    {
      id: "b1",
      title: "竖屏短剧《城南夜雨》英文字幕译制",
      summary: "80 集竖屏，需英文精译 + 时间轴，风格偏都市悬疑。",
      category: "译制",
      budgetT: 800,
      deadline: "2026-08-10",
      clientOrg: "长安短剧工作室",
      status: "open",
      applicants: [],
    },
    {
      id: "b2",
      title: "男主配音（东南亚发行版）",
      summary: "泰语男主配音 20 集样片，需提供试音。",
      category: "配音",
      budgetT: 1200,
      deadline: "2026-08-20",
      clientOrg: "秦川影视",
      status: "open",
      applicants: [
        {
          id: "a-demo",
          name: "演示应征",
          org: "外站供应商",
          note: "有泰语配音案例",
        },
      ],
    },
    {
      id: "b3",
      title: "印尼市场发行物料包",
      summary: "海报、预告片字幕、商店文案本地化。",
      category: "发行",
      budgetT: 500,
      deadline: "2026-08-05",
      clientOrg: "西影内容中心",
      status: "open",
      applicants: [],
    },
  ];
}

function initialState(): WorkState {
  return {
    user: null,
    balance: 0,
    frozen: 0,
    bounties: seedBounties(),
    orders: [],
    ledger: [],
    messages: [
      {
        id: "m0",
        from: "agent",
        text: "你好，我是微短剧工作端助手。可以说「买 Token」「发悬赏」「看看可接任务」或「待验收」。关键扣款与放款都会先请你确认。",
      },
    ],
    pendingConfirm: null,
  };
}

const WorkCtx = createContext<WorkContextValue | null>(null);

function nowLabel() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function WorkDemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkState>(initialState);

  const login = useCallback((user: WorkUser) => {
    setState({
      ...initialState(),
      user,
      balance: user.role === "client" ? 200 : 50,
      messages: [
        {
          id: uid("m"),
          from: "agent",
          text:
            user.role === "client"
              ? `已进入工作端 · ${user.name}（客户）。当前可用 200 T。可以说「发一个译制悬赏」或「查看应征」。`
              : `已进入工作端 · ${user.name}（供应商）。可以说「看看可接悬赏」或「我的订单」。`,
        },
      ],
    });
  }, []);

  const logout = useCallback(() => setState(initialState()), []);
  const resetDemo = useCallback(() => {
    setState((s) => {
      if (!s.user) return initialState();
      const u = s.user;
      return {
        ...initialState(),
        user: u,
        balance: u.role === "client" ? 200 : 50,
        messages: [
          {
            id: uid("m"),
            from: "system",
            text: "演示数据已重置。",
          },
          {
            id: uid("m"),
            from: "agent",
            text: "已清空悬赏与订单演示数据，余额回到初始值。继续吩咐即可。",
          },
        ],
      };
    });
  }, []);

  const pushUserMsg = useCallback((text: string) => {
    setState((s) => ({
      ...s,
      messages: [...s.messages, { id: uid("m"), from: "user", text }],
    }));
  }, []);

  const requestBuy = useCallback((amountT: number) => {
    const cny = amountT; // 演示 1¥ = 1T
    setState((s) => ({
      ...s,
      pendingConfirm: { type: "buy", amountT, cny },
      messages: [
        ...s.messages,
        {
          id: uid("m"),
          from: "agent",
          text: `准备向平台购入 ${amountT} T（约 ¥${cny}）。请在下方确认条点头；确认后记账并开票入口可在钱包查看。`,
        },
      ],
    }));
  }, []);

  const requestMatch = useCallback((bountyId: string, applicantId: string) => {
    setState((s) => {
      const b = s.bounties.find((x) => x.id === bountyId);
      const a = b?.applicants.find((x) => x.id === applicantId);
      if (!b || !a) return s;
      return {
        ...s,
        pendingConfirm: { type: "match", bountyId, applicantId },
        messages: [
          ...s.messages,
          {
            id: uid("m"),
            from: "agent",
            text: `建议与「${a.org} · ${a.name}」合作，预算 ${b.budgetT} T。确认后将立即冻结你的预算（不可静默执行）。`,
          },
        ],
      };
    });
  }, []);

  const requestAccept = useCallback((orderId: string) => {
    setState((s) => {
      const o = s.orders.find((x) => x.id === orderId);
      if (!o) return s;
      return {
        ...s,
        pendingConfirm: { type: "accept", orderId },
        messages: [
          ...s.messages,
          {
            id: uid("m"),
            from: "agent",
            text: `订单「${o.title}」待验收。确认验收后，平台将向供应商结算 ${Math.round(o.frozenT * (1 - FEE_RATE))} T（演示费率 5%）。`,
          },
        ],
      };
    });
  }, []);

  const cancelPending = useCallback(() => {
    setState((s) => ({
      ...s,
      pendingConfirm: null,
      messages: [
        ...s.messages,
        { id: uid("m"), from: "system", text: "已取消本次确认。" },
      ],
    }));
  }, []);

  const confirmPending = useCallback(() => {
    setState((s) => {
      const p = s.pendingConfirm;
      if (!p) return s;

      if (p.type === "buy") {
        return {
          ...s,
          pendingConfirm: null,
          balance: s.balance + p.amountT,
          ledger: [
            {
              id: uid("l"),
              at: nowLabel(),
              label: `官方购入 ${p.amountT} T`,
              delta: p.amountT,
              role: "client",
            },
            ...s.ledger,
          ],
          messages: [
            ...s.messages,
            {
              id: uid("m"),
              from: "agent",
              text: `已购入 ${p.amountT} T。可用余额 ${s.balance + p.amountT} T。可在钱包申请发票（演示占位）。`,
            },
          ],
        };
      }

      if (p.type === "match") {
        const b = s.bounties.find((x) => x.id === p.bountyId);
        const a = b?.applicants.find((x) => x.id === p.applicantId);
        if (!b || !a) return { ...s, pendingConfirm: null };
        if (s.balance < b.budgetT) {
          return {
            ...s,
            pendingConfirm: null,
            messages: [
              ...s.messages,
              {
                id: uid("m"),
                from: "agent",
                text: `余额不足：需要 ${b.budgetT} T，当前可用 ${s.balance} T。请先购 Token。`,
              },
            ],
          };
        }
        const orderId = uid("o");
        const order: Order = {
          id: orderId,
          bountyId: b.id,
          title: b.title,
          budgetT: b.budgetT,
          clientOrg: b.clientOrg,
          supplierOrg: a.org,
          supplierName: a.name,
          status: "escrowed",
          frozenT: b.budgetT,
        };
        return {
          ...s,
          pendingConfirm: null,
          balance: s.balance - b.budgetT,
          frozen: s.frozen + b.budgetT,
          orders: [order, ...s.orders],
          bounties: s.bounties.map((x) =>
            x.id === b.id
              ? {
                  ...x,
                  status: "matched" as const,
                  selectedApplicantId: a.id,
                  orderId,
                }
              : x,
          ),
          ledger: [
            {
              id: uid("l"),
              at: nowLabel(),
              label: `托管冻结 · ${b.title}`,
              delta: -b.budgetT,
              role: "client",
            },
            ...s.ledger,
          ],
          messages: [
            ...s.messages,
            {
              id: uid("m"),
              from: "agent",
              text: `已冻结预算 ${b.budgetT} T，订单进入托管。供应商可开始履约。`,
            },
          ],
        };
      }

      if (p.type === "accept") {
        const o = s.orders.find((x) => x.id === p.orderId);
        if (!o || o.status === "paid") return { ...s, pendingConfirm: null };
        const paid = Math.round(o.frozenT * (1 - FEE_RATE));
        const fee = o.frozenT - paid;
        return {
          ...s,
          pendingConfirm: null,
          frozen: Math.max(0, s.frozen - o.frozenT),
          // supplier demo balance only if current user is supplier; also track in ledger
          balance:
            s.user?.role === "supplier" ? s.balance + paid : s.balance,
          orders: s.orders.map((x) =>
            x.id === o.id
              ? { ...x, status: "paid" as const, paidT: paid }
              : x,
          ),
          bounties: s.bounties.map((x) =>
            x.orderId === o.id ? { ...x, status: "done" as const } : x,
          ),
          ledger: [
            {
              id: uid("l"),
              at: nowLabel(),
              label: `验收放款至供应商 · ${o.title}`,
              delta: paid,
              role: "supplier",
            },
            {
              id: uid("l"),
              at: nowLabel(),
              label: `平台撮合费`,
              delta: fee,
              role: "system",
            },
            ...s.ledger,
          ],
          messages: [
            ...s.messages,
            {
              id: uid("m"),
              from: "agent",
              text: `验收通过。平台已向「${o.supplierOrg}」结算 ${paid} T（撮合费 ${fee} T）。`,
            },
          ],
        };
      }

      return s;
    });
  }, []);

  const publishBounty = useCallback(
    (input: {
      title: string;
      summary: string;
      category: string;
      budgetT: number;
      deadline: string;
    }) => {
      setState((s) => {
        if (!s.user || s.user.role !== "client") return s;
        const b: Bounty = {
          id: uid("b"),
          ...input,
          clientOrg: s.user.org,
          status: "open",
          applicants: [],
        };
        return {
          ...s,
          bounties: [b, ...s.bounties],
          messages: [
            ...s.messages,
            {
              id: uid("m"),
              from: "agent",
              text: `悬赏已发布：「${b.title}」· ${b.budgetT} T · ${b.category}。供应商可在可接列表看到。`,
            },
          ],
        };
      });
    },
    [],
  );

  const applyBounty = useCallback((bountyId: string, note: string) => {
    setState((s) => {
      if (!s.user || s.user.role !== "supplier") return s;
      const b = s.bounties.find((x) => x.id === bountyId);
      if (!b || b.status !== "open") return s;
      if (b.applicants.some((a) => a.id === s.user!.id)) {
        return {
          ...s,
          messages: [
            ...s.messages,
            { id: uid("m"), from: "agent", text: "你已应征过该悬赏。" },
          ],
        };
      }
      return {
        ...s,
        bounties: s.bounties.map((x) =>
          x.id === bountyId
            ? {
                ...x,
                applicants: [
                  ...x.applicants,
                  {
                    id: s.user!.id,
                    name: s.user!.name,
                    org: s.user!.org,
                    note: note || "可以承接，请确认合作。",
                  },
                ],
              }
            : x,
        ),
        messages: [
          ...s.messages,
          {
            id: uid("m"),
            from: "agent",
            text: `已应征「${b.title}」。等待客户确认后才会冻结对方预算。`,
          },
        ],
      };
    });
  }, []);

  const markDelivered = useCallback((orderId: string) => {
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) =>
        o.id === orderId && o.status === "escrowed"
          ? { ...o, status: "in_progress" as const }
          : o,
      ),
      messages: [
        ...s.messages,
        {
          id: uid("m"),
          from: "agent",
          text: "已标记履约中/交付待验收。请客户在确认条验收。",
        },
      ],
    }));
  }, []);

  const askAgent = useCallback(
    (text: string) => {
      pushUserMsg(text);
      const t = text.trim();
      const lower = t.toLowerCase();

      setTimeout(() => {
        setState((s) => {
          if (!s.user) return s;
          const role = s.user.role;

          if (/买|购|token|额度/.test(t)) {
            return {
              ...s,
              pendingConfirm: { type: "buy", amountT: 500, cny: 500 },
              messages: [
                ...s.messages,
                {
                  id: uid("m"),
                  from: "agent",
                  text: "演示默认购入 500 T（¥500）。请在确认条确认，或打开钱包自选套餐。",
                },
              ],
            };
          }

          if (/发悬赏|发布|译制悬赏/.test(t) && role === "client") {
            const b: Bounty = {
              id: uid("b"),
              title: "《城南夜雨》精校字幕加急",
              summary: "Agent 代拟：40 集加急精校，保留悬疑语气。",
              category: "译制",
              budgetT: 300,
              deadline: "2026-08-15",
              clientOrg: s.user.org,
              status: "open",
              applicants: [],
            };
            return {
              ...s,
              bounties: [b, ...s.bounties],
              messages: [
                ...s.messages,
                {
                  id: uid("m"),
                  from: "agent",
                  text: `已按你的意图代拟并发布悬赏：「${b.title}」预算 ${b.budgetT} T。可在「可接列表」查看；也可打开发布页细改（演示已直发）。`,
                },
              ],
            };
          }

          if (/可接|大厅|悬赏列表|看看/.test(t)) {
            const open = s.bounties.filter((b) => b.status === "open");
            return {
              ...s,
              messages: [
                ...s.messages,
                {
                  id: uid("m"),
                  from: "agent",
                  text: `当前开放悬赏 ${open.length} 条：${open
                    .slice(0, 3)
                    .map((b) => `「${b.title}」${b.budgetT}T`)
                    .join("；") || "暂无"}。右侧可打开完整列表。`,
                },
              ],
            };
          }

          if (/应征|待确认|确认合作/.test(t) && role === "client") {
            const waiting = s.bounties.filter(
              (b) => b.status === "open" && b.applicants.length > 0,
            );
            if (!waiting.length) {
              return {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: uid("m"),
                    from: "agent",
                    text: "暂无待确认应征。可切到供应商账号去应征一条，再切回来确认。",
                  },
                ],
              };
            }
            const b = waiting[0];
            const a = b.applicants[0];
            return {
              ...s,
              pendingConfirm: {
                type: "match",
                bountyId: b.id,
                applicantId: a.id,
              },
              messages: [
                ...s.messages,
                {
                  id: uid("m"),
                  from: "agent",
                  text: `发现应征：${a.org} · ${a.name} →「${b.title}」。确认后冻结 ${b.budgetT} T。`,
                },
              ],
            };
          }

          if (/应征|接单/.test(t) && role === "supplier") {
            const open = s.bounties.find(
              (b) =>
                b.status === "open" &&
                !b.applicants.some((a) => a.id === s.user!.id),
            );
            if (!open) {
              return {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: uid("m"),
                    from: "agent",
                    text: "没有可新应征的开放悬赏，或你已全部应征过。",
                  },
                ],
              };
            }
            return {
              ...s,
              bounties: s.bounties.map((x) =>
                x.id === open.id
                  ? {
                      ...x,
                      applicants: [
                        ...x.applicants,
                        {
                          id: s.user!.id,
                          name: s.user!.name,
                          org: s.user!.org,
                          note: "可承接，档期充足。",
                        },
                      ],
                    }
                  : x,
              ),
              messages: [
                ...s.messages,
                {
                  id: uid("m"),
                  from: "agent",
                  text: `已帮你应征「${open.title}」。等客户确认合作后才会进入托管。`,
                },
              ],
            };
          }

          if (/验收|待验收|放款/.test(t)) {
            const o =
              s.orders.find((x) => x.status === "in_progress") ||
              s.orders.find((x) => x.status === "escrowed");
            if (!o) {
              return {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: uid("m"),
                    from: "agent",
                    text: "暂无待验收订单。确认合作并标记履约后再来。",
                  },
                ],
              };
            }
            if (role === "supplier" && o.status === "escrowed") {
              return {
                ...s,
                orders: s.orders.map((x) =>
                  x.id === o.id ? { ...x, status: "in_progress" as const } : x,
                ),
                messages: [
                  ...s.messages,
                  {
                    id: uid("m"),
                    from: "agent",
                    text: `已将「${o.title}」标为履约中。请客户验收放款。`,
                  },
                ],
              };
            }
            if (role === "client") {
              return {
                ...s,
                pendingConfirm: { type: "accept", orderId: o.id },
                messages: [
                  ...s.messages,
                  {
                    id: uid("m"),
                    from: "agent",
                    text: `订单「${o.title}」可验收。确认后平台结算供应商（演示扣 5% 撮合费）。`,
                  },
                ],
              };
            }
          }

          if (/余额|钱包|流水/.test(t) || lower.includes("wallet")) {
            return {
              ...s,
              messages: [
                ...s.messages,
                {
                  id: uid("m"),
                  from: "agent",
                  text: `可用 ${s.balance} T，冻结 ${s.frozen} T。打开钱包可购 T、看流水与开票入口。`,
                },
              ],
            };
          }

          return {
            ...s,
            messages: [
              ...s.messages,
              {
                id: uid("m"),
                from: "agent",
                text:
                  role === "client"
                    ? "我可以：买 Token、代发悬赏、梳理应征并请你确认冻结、协助验收放款。试试「买 Token」或「发悬赏」。"
                    : "我可以：列出可接悬赏、代为应征、标记履约、提醒收款。试试「看看可接任务」或「应征」。",
              },
            ],
          };
        });
      }, 280);
    },
    [pushUserMsg],
  );

  const value = useMemo<WorkContextValue>(
    () => ({
      ...state,
      login,
      logout,
      pushUserMsg,
      askAgent,
      requestBuy,
      confirmPending,
      cancelPending,
      publishBounty,
      applyBounty,
      requestMatch,
      markDelivered,
      requestAccept,
      resetDemo,
    }),
    [
      state,
      login,
      logout,
      pushUserMsg,
      askAgent,
      requestBuy,
      confirmPending,
      cancelPending,
      publishBounty,
      applyBounty,
      requestMatch,
      markDelivered,
      requestAccept,
      resetDemo,
    ],
  );

  return <WorkCtx.Provider value={value}>{children}</WorkCtx.Provider>;
}

export function useWorkDemo() {
  const ctx = useContext(WorkCtx);
  if (!ctx) throw new Error("useWorkDemo outside provider");
  return ctx;
}

export const DEMO_USERS = USERS;
