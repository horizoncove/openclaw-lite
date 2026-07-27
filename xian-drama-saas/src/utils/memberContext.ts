import type { AllianceUser, Member } from "../types";

/** 根据登录用户的 org 字段匹配会员单位档案 */
export function findMemberOrg(
  user: AllianceUser | null,
  members: Member[]
): Member | undefined {
  if (!user?.org) return undefined;
  return members.find((m) => m.name === user.org);
}
