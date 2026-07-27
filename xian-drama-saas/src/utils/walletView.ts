import type { DealLedgerEntry, DealProject, OrgWallet } from "../types";
import { payMeta } from "./dealLoop";

/** 按托管理论拆解一家机构的钱包视图 */
export function buildOrgWalletView(
  org: string,
  wallets: OrgWallet[],
  deals: DealProject[],
) {
  const wallet = wallets.find((w) => w.org === org) ?? {
    org,
    balance: 0,
    locked: 0,
    role: "buyer" as const,
  };
  const asBuyer = deals.filter((d) => d.buyerOrg === org && d.phase !== "已闭环");
  const asSupplier = deals.filter((d) => d.supplierOrg === org && d.phase !== "已闭环");
  const asBroker = org === "联盟秘书处";

  const escrowAsBuyer = asBuyer.reduce((a, d) => a + (d.escrow || 0), 0);
  const unfundedAsBuyer = asBuyer.reduce((a, d) => a + (d.unfunded || 0), 0);
  const heldAsSupplier = asSupplier.reduce((a, d) => a + (d.heldSupplier || 0), 0);
  const earnedAsSupplier = deals
    .filter((d) => d.supplierOrg === org)
    .reduce((a, d) => a + (d.supplierEarned || 0), 0);
  const heldAsBroker = deals.reduce((a, d) => a + (d.heldBroker || 0), 0);
  const earnedAsBroker = deals.reduce((a, d) => a + (d.brokerEarned || 0), 0);

  const locked = wallet.locked ?? 0;
  const drift = locked - escrowAsBuyer;

  const formula = {
    free: wallet.balance,
    locked,
    escrowInProjects: escrowAsBuyer,
    unfunded: unfundedAsBuyer,
    /** 锁定应约等于买方在途托管之和；偏差用于演示对账 */
    lockEscrowDrift: drift,
    heldReceivable: asBroker ? heldAsBroker : heldAsSupplier,
    realizedIncentive: asBroker ? earnedAsBroker : earnedAsSupplier,
  };

  const projectRows = [
    ...asBuyer.map((d) => ({
      side: "买方" as const,
      deal: d,
      escrow: d.escrow || 0,
      unfunded: d.unfunded || 0,
      held: 0,
      earned: 0,
      lockHint: `${payMeta(d.payMechanism).label} · 首冻 ${Math.round(payMeta(d.payMechanism).lockRatioOnOpen * 100)}%`,
    })),
    ...asSupplier.map((d) => ({
      side: "供给" as const,
      deal: d,
      escrow: 0,
      unfunded: 0,
      held: d.heldSupplier || 0,
      earned: d.supplierEarned || 0,
      lockHint:
        d.payMechanism === "验收后支付"
          ? "激励暂挂至验收结算"
          : "激励随履约即时入账",
    })),
  ];

  const ledger: (DealLedgerEntry & { dealId: string; sceneName: string })[] = deals
    .filter((d) => d.buyerOrg === org || d.supplierOrg === org || (asBroker && d.broker === org))
    .flatMap((d) =>
      (d.ledger || []).map((l) => ({
        ...l,
        dealId: d.id,
        sceneName: d.sceneName,
      })),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 40);

  return { wallet, formula, projectRows, ledger, asBuyer, asSupplier };
}

export function networkWalletStats(wallets: OrgWallet[], deals: DealProject[]) {
  const free = wallets.reduce((a, w) => a + (w.balance || 0), 0);
  const locked = wallets.reduce((a, w) => a + (w.locked || 0), 0);
  const escrow = deals
    .filter((d) => d.phase !== "已闭环")
    .reduce((a, d) => a + (d.escrow || 0), 0);
  const held =
    deals.reduce((a, d) => a + (d.heldBroker || 0) + (d.heldSupplier || 0), 0);
  const unfunded = deals.reduce((a, d) => a + (d.unfunded || 0), 0);
  return { free, locked, escrow, held, unfunded, orgs: wallets.length };
}
