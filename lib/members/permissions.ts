// lib/members/permissions.ts
/**
 * Membership permission checks — distinct from invite permissions because
 * member mutations require different guards (e.g. last-owner protection).
 *
 * Role hierarchy: owner > admin > member > viewer.
 */

import type { UserPayload } from "@/lib/security/api-auth";

export function canManageMembers(user: UserPayload): boolean {
  return (
    user.roles.includes("owner") ||
    user.roles.includes("admin") ||
    user.permissions.includes("members:manage")
  );
}

export function canViewMembers(user: UserPayload): boolean {
  return (
    user.roles.includes("owner") ||
    user.roles.includes("admin") ||
    user.roles.includes("member") ||
    user.permissions.includes("members:view")
  );
}

/**
 * Whether the caller's role set permits assigning `targetRole` to a member.
 * Owner can assign any role. Admin cannot assign or revoke Owner.
 */
export function canAssignMemberRole(
  callerRoles: string[],
  targetRole: string
): boolean {
  if (callerRoles.includes("owner")) return true;
  if (callerRoles.includes("admin")) {
    return targetRole !== "owner";
  }
  return false;
}

/**
 * Whether the caller can remove a member with the given role.
 * Owner can remove anyone (subject to last-owner invariant enforced in store).
 * Admin cannot remove Owners.
 */
export function canRemoveMemberWithRole(
  callerRoles: string[],
  targetRole: string
): boolean {
  if (callerRoles.includes("owner")) return true;
  if (callerRoles.includes("admin")) {
    return targetRole !== "owner";
  }
  return false;
}
