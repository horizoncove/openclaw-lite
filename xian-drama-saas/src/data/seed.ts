import type { AllianceState, CenterState } from "../types";
import allianceJson from "../../server/data/alliance-seed.json";
import centerJson from "../../server/data/center-seed.json";

export const allianceSeed = (): Omit<AllianceState, "user"> => {
  const data = structuredClone(allianceJson) as Omit<AllianceState, "user">;
  return {
    ...data,
    deals: data.deals ?? [],
    orgWallets: data.orgWallets ?? [],
    scenePackages: data.scenePackages ?? [],
    works: data.works ?? [],
    venues: data.venues ?? [],
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
