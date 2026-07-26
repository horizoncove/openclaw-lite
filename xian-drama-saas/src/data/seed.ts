import type { AllianceState, CenterState } from "../types";
import allianceJson from "../../server/data/alliance-seed.json";
import centerJson from "../../server/data/center-seed.json";

export const allianceSeed = (): Omit<AllianceState, "user"> => {
  const data = structuredClone(allianceJson) as Omit<AllianceState, "user">;
  return {
    ...data,
    deals: (data.deals ?? []).map((d) => ({
      ...d,
      payMechanism: d.payMechanism ?? "预付",
      payMechanismSource: d.payMechanismSource ?? "buyer",
      unfunded: d.unfunded ?? 0,
      heldBroker: d.heldBroker ?? 0,
      heldSupplier: d.heldSupplier ?? 0,
      escrow: d.escrow ?? Math.max(0, (d.budget ?? 0) - (d.spent ?? 0)),
    })),
    orgWallets: (data.orgWallets ?? []).map((w) => ({
      ...w,
      locked: w.locked ?? 0,
    })),
    scenePackages: data.scenePackages ?? [],
    works: data.works ?? [],
    venues: data.venues ?? [],
    bids: data.bids ?? [],
    disputes: data.disputes ?? [],
  };
};

export const centerSeed = (): Omit<CenterState, "user"> =>
  structuredClone(centerJson) as Omit<CenterState, "user">;

/** @deprecated 仅用于脚本兼容 */
export const today = () => new Date().toISOString().slice(0, 10);
export const plus = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
