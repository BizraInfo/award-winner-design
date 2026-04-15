// lib/members/errors.ts
/**
 * Typed errors for workspace membership mutations.
 * Never swallow these — callers must map them to HTTP status or UI state.
 */

export class LastOwnerInvariantError extends Error {
  readonly code = "LAST_OWNER_INVARIANT" as const;
  constructor(public readonly workspaceId: string) {
    super(`Cannot demote or remove the last Owner of workspace ${workspaceId}`);
    this.name = "LastOwnerInvariantError";
  }
}

export class DuplicateMembershipError extends Error {
  readonly code = "DUPLICATE_MEMBERSHIP" as const;
  constructor(public readonly workspaceId: string, public readonly userId: string) {
    super(`User ${userId} is already a member of workspace ${workspaceId}`);
    this.name = "DuplicateMembershipError";
  }
}

export class MemberNotFoundError extends Error {
  readonly code = "MEMBER_NOT_FOUND" as const;
  constructor(public readonly memberId: string) {
    super(`Member ${memberId} not found`);
    this.name = "MemberNotFoundError";
  }
}
