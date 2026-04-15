// lib/invites/permissions.ts
/**
 * Invite permission checks.
 *
 * Role hierarchy (highest → lowest): owner > admin > member > viewer.
 *
 * Rules:
 *   - Viewer: no invite actions.
 *   - Member: can view invites, cannot manage.
 *   - Admin: can view + manage invites; can assign admin/member/viewer but NOT owner.
 *   - Owner: full control, including assigning owner.
 *
 * Hard invariants enforced elsewhere (membership layer — see NOTE at bottom):
 *   - Never zero owners in a workspace.
 *   - Admin cannot promote to owner.
 *   - Revoked / expired invites cannot be accepted.
 */

import type { UserPayload } from '@/lib/security/api-auth';

export function canManageInvites(user: UserPayload): boolean {
  return (
    user.roles.includes('owner') ||
    user.roles.includes('admin') ||
    user.permissions.includes('invites:manage')
  );
}

export function canViewInvites(user: UserPayload): boolean {
  return (
    user.roles.includes('owner') ||
    user.roles.includes('admin') ||
    user.roles.includes('member') ||
    user.permissions.includes('invites:view')
  );
}

/**
 * Whether the inviter's role set permits granting `targetRole`.
 *
 * Owner can assign any role, including owner.
 * Admin can assign admin/member/viewer, NOT owner.
 * Anyone else cannot assign privileged roles.
 */
export function canAssignRole(
  inviterRoles: string[],
  targetRole: string
): boolean {
  if (inviterRoles.includes('owner')) return true;
  if (inviterRoles.includes('admin')) {
    return targetRole !== 'owner';
  }
  // Non-privileged: may only assign viewer or member (retains previous behavior).
  return targetRole === 'viewer' || targetRole === 'member';
}

// NOTE — Last-owner invariant enforcement lives in lib/members/member-store.ts
// inside updateRole() and remove(). This file only governs invite-time role
// assignability (Owner-grant gating).
