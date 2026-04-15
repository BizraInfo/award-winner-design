// lib/members/resolve-role.ts
/**
 * Resolve workspace-scoped role from the member store and merge it into the
 * JWT's global roles array. The JWT carries global roles like "user"; the
 * member store carries workspace-scoped roles like "owner". Permission checks
 * in this codebase read roles arrays — this helper lets them see both.
 *
 * Why: genesis owner seeded via /api/auth/me has JWT roles=["user"] and a
 * member-store entry with role="owner". Without this resolver, permission
 * checks read only the JWT and reject the owner with 403.
 */

import type { UserPayload } from "@/lib/security/api-auth";
import { getMemberStore } from "./member-store";

export async function resolveWorkspaceUser(
  workspaceId: string,
  user: UserPayload
): Promise<UserPayload> {
  const store = getMemberStore();
  const membership = await store.getByUserAndWorkspace(workspaceId, user.sub);
  if (!membership) return user;
  if (user.roles.includes(membership.role)) return user;
  return { ...user, roles: [...user.roles, membership.role] };
}
