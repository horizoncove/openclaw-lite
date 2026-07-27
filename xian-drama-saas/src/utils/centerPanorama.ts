import type {
  CenterPanorama,
  CenterRole,
  CenterState,
  TokenWallet,
} from "../types";
import { CENTER_ROLE_LABEL } from "../types";

const CENTER_LINKS: Record<CenterRole, string> = {
  approval: "/center/console/approval",
  overseas: "/center/console/overseas",
  distribution: "/center/console/distribution",
  copyright: "/center/console/copyright",
  ai: "/center/console/ai",
};

const CENTER_ORDER_NAMES: Record<string, string> = {
  审批: "approval",
  出海: "overseas",
  发行投流: "distribution",
  版权: "copyright",
  AI: "ai",
};

export function buildCenterPanorama(state: Omit<CenterState, "user">): CenterPanorama {
  const { orders, approvals, overseas, distributions, copyrights, ais, tokenWallet } = state;
  const openOrders = orders.filter((o) => !["完结", "关闭"].includes(o.status));
  const highPriority = openOrders.filter((o) => o.priority === "高").length;

  const ordersByCenter: Record<string, number> = {};
  for (const o of orders) {
    ordersByCenter[o.center] = (ordersByCenter[o.center] ?? 0) + 1;
  }

  const centers = [
    {
      id: "approval" as const,
      name: CENTER_ROLE_LABEL.approval,
      workload: approvals.length,
      active: approvals.filter((a) => !["已出具意见", "已送审"].includes(a.stage)).length,
      alerts: approvals.filter((a) => a.risk === "高" || a.stage === "会诊").length,
      link: CENTER_LINKS.approval,
    },
    {
      id: "overseas" as const,
      name: CENTER_ROLE_LABEL.overseas,
      workload: overseas.length,
      active: overseas.filter((o) => !["上线", "结算"].includes(o.stage)).length,
      alerts: overseas.filter((o) => o.score < 60).length,
      link: CENTER_LINKS.overseas,
    },
    {
      id: "distribution" as const,
      name: CENTER_ROLE_LABEL.distribution,
      workload: distributions.length,
      active: distributions.filter((d) => d.stage !== "复盘").length,
      alerts: distributions.filter((d) => !d.roi).length,
      link: CENTER_LINKS.distribution,
    },
    {
      id: "copyright" as const,
      name: CENTER_ROLE_LABEL.copyright,
      workload: copyrights.length,
      active: copyrights.filter((c) => c.status === "进行中").length,
      alerts: copyrights.filter((c) => c.status === "转介").length,
      link: CENTER_LINKS.copyright,
    },
    {
      id: "ai" as const,
      name: CENTER_ROLE_LABEL.ai,
      workload: ais.length,
      active: ais.filter((a) => ["接入中", "试点"].includes(a.status)).length,
      alerts: ais.filter((a) => a.status === "停用").length,
      link: CENTER_LINKS.ai,
    },
  ];

  const totalWorkload =
    approvals.length + overseas.length + distributions.length + copyrights.length + ais.length;

  const tokenUsageTrend = [
    { label: "7/17", value: 5200 },
    { label: "7/18", value: 6800 },
    { label: "7/19", value: 4100 },
    { label: "7/20", value: 9200 },
    { label: "7/21", value: 12400 },
    { label: "7/22", value: 23800 },
    { label: "7/23", value: 8600 },
  ];

  return {
    summary: {
      openOrders: openOrders.length,
      highPriority,
      tokenBalance: tokenWallet.balance,
      monthlyTokenUsage: tokenWallet.usedThisMonth,
      totalWorkload,
    },
    centers,
    ordersByCenter,
    tokenUsageTrend,
    recentOrders: openOrders.slice(0, 6),
    recentTransactions: tokenWallet.transactions.slice(0, 5),
  };
}

export function defaultTokenWallet(): TokenWallet {
  return {
    balance: 0,
    usedThisMonth: 0,
    monthlyQuota: 100000,
    apiKey: `xd-center-sk-${Math.random().toString(36).slice(2, 10)}`,
    transactions: [],
  };
}

export { CENTER_ORDER_NAMES };
