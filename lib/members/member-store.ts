// lib/members/member-store.ts
/**
 * Workspace Members store — mirrors the token-store / invite-store pattern:
 * interface + MemoryStore (dev) + Redis stub via REDIS_URL. No ORM.
 *
 * The last-owner invariant is enforced INSIDE updateRole() and remove() so
 * no external call site can bypass it.
 */

import {
  LastOwnerInvariantError,
  DuplicateMembershipError,
  MemberNotFoundError,
} from "./errors";

export type MemberRole = "owner" | "admin" | "member" | "viewer";

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  role: MemberRole;
  joinedAt: number;
  invitedBy?: string;
  inviteId?: string;
  lastRoleChangeAt?: number;
  lastRoleChangeBy?: string;
}

export interface WorkspaceMemberStore {
  add(member: WorkspaceMember): Promise<void>;
  getById(id: string): Promise<WorkspaceMember | null>;
  getByUserAndWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMember | null>;
  listByWorkspace(workspaceId: string): Promise<WorkspaceMember[]>;
  listOwners(workspaceId: string): Promise<WorkspaceMember[]>;
  countOwners(workspaceId: string): Promise<number>;
  updateRole(
    id: string,
    newRole: MemberRole,
    changedBy: string
  ): Promise<void>;
  remove(id: string): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE (Development)
// ═══════════════════════════════════════════════════════════════════════════════

class MemoryWorkspaceMemberStore implements WorkspaceMemberStore {
  private members = new Map<string, WorkspaceMember>();

  async add(member: WorkspaceMember): Promise<void> {
    const dup = await this.getByUserAndWorkspace(
      member.workspaceId,
      member.userId
    );
    if (dup) {
      throw new DuplicateMembershipError(member.workspaceId, member.userId);
    }
    this.members.set(member.id, { ...member });
  }

  async getById(id: string): Promise<WorkspaceMember | null> {
    const m = this.members.get(id);
    return m ? { ...m } : null;
  }

  async getByUserAndWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMember | null> {
    for (const m of this.members.values()) {
      if (m.workspaceId === workspaceId && m.userId === userId) {
        return { ...m };
      }
    }
    return null;
  }

  async listByWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    const out: WorkspaceMember[] = [];
    for (const m of this.members.values()) {
      if (m.workspaceId === workspaceId) out.push({ ...m });
    }
    return out.sort((a, b) => a.joinedAt - b.joinedAt);
  }

  async listOwners(workspaceId: string): Promise<WorkspaceMember[]> {
    const all = await this.listByWorkspace(workspaceId);
    return all.filter((m) => m.role === "owner");
  }

  async countOwners(workspaceId: string): Promise<number> {
    const owners = await this.listOwners(workspaceId);
    return owners.length;
  }

  async updateRole(
    id: string,
    newRole: MemberRole,
    changedBy: string
  ): Promise<void> {
    const existing = this.members.get(id);
    if (!existing) throw new MemberNotFoundError(id);
    if (existing.role === "owner" && newRole !== "owner") {
      const ownerCount = await this.countOwners(existing.workspaceId);
      if (ownerCount <= 1) {
        throw new LastOwnerInvariantError(existing.workspaceId);
      }
    }
    this.members.set(id, {
      ...existing,
      role: newRole,
      lastRoleChangeAt: Date.now(),
      lastRoleChangeBy: changedBy,
    });
  }

  async remove(id: string): Promise<void> {
    const existing = this.members.get(id);
    if (!existing) throw new MemberNotFoundError(id);
    if (existing.role === "owner") {
      const ownerCount = await this.countOwners(existing.workspaceId);
      if (ownerCount <= 1) {
        throw new LastOwnerInvariantError(existing.workspaceId);
      }
    }
    this.members.delete(id);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let _store: WorkspaceMemberStore | null = null;

export function getMemberStore(): WorkspaceMemberStore {
  if (!_store) {
    // Future: if (process.env.REDIS_URL) { _store = new RedisWorkspaceMemberStore(); }
    _store = new MemoryWorkspaceMemberStore();
  }
  return _store;
}

/** For tests only — reset the singleton. */
export function __resetMemberStoreForTests(): void {
  _store = null;
}
