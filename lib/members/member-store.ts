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
import {
  __resetRedisClientForTests,
  getRedisClient,
  hasRedisConfigured,
} from "@/lib/redis/client";

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
// REDIS STORE (cross-instance durability)
// ═══════════════════════════════════════════════════════════════════════════════

class RedisWorkspaceMemberStore implements WorkspaceMemberStore {
  private keyId(id: string): string {
    return `bizra:members:id:${id}`;
  }

  private keyUser(workspaceId: string, userId: string): string {
    return `bizra:members:user:${workspaceId}:${userId}`;
  }

  private keyWorkspace(workspaceId: string): string {
    return `bizra:members:workspace:${workspaceId}`;
  }

  private keyOwners(workspaceId: string): string {
    return `bizra:members:owners:${workspaceId}`;
  }

  private async getClient(operation: string) {
    return getRedisClient(`member-store:${operation}`);
  }

  private parseMember(raw: string | null): WorkspaceMember | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WorkspaceMember;
    } catch {
      return null;
    }
  }

  private async readMemberById(
    id: string
  ): Promise<WorkspaceMember | null> {
    const client = await this.getClient("readMemberById");
    return this.parseMember(await client.get(this.keyId(id)));
  }

  async add(member: WorkspaceMember): Promise<void> {
    const client = await this.getClient("add");
    const workspaceKey = this.keyWorkspace(member.workspaceId);
    const userKey = this.keyUser(member.workspaceId, member.userId);
    const ownersKey = this.keyOwners(member.workspaceId);
    const isGenesisOwner =
      member.role === "owner" && !member.inviteId && !member.invitedBy;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await client.watch(userKey, workspaceKey);

      const existingUser = await client.get(userKey);
      if (existingUser) {
        await client.unwatch();
        throw new DuplicateMembershipError(member.workspaceId, member.userId);
      }

      if (isGenesisOwner) {
        const memberCount = await client.sCard(workspaceKey);
        if (memberCount > 0) {
          await client.unwatch();
          throw new DuplicateMembershipError(member.workspaceId, member.userId);
        }
      }

      const multi = client.multi();
      multi.set(userKey, member.id);
      multi.set(this.keyId(member.id), JSON.stringify(member));
      multi.sAdd(workspaceKey, member.id);
      if (member.role === "owner") {
        multi.sAdd(ownersKey, member.id);
      }

      const result = await multi.exec();
      if (result !== null) {
        return;
      }
    }

    throw new DuplicateMembershipError(member.workspaceId, member.userId);
  }

  async getById(id: string): Promise<WorkspaceMember | null> {
    return this.readMemberById(id);
  }

  async getByUserAndWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMember | null> {
    const client = await this.getClient("getByUserAndWorkspace");
    const memberId = await client.get(this.keyUser(workspaceId, userId));
    if (!memberId) return null;
    return this.parseMember(await client.get(this.keyId(memberId)));
  }

  async listByWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    const client = await this.getClient("listByWorkspace");
    const ids = await client.sMembers(this.keyWorkspace(workspaceId));
    if (ids.length === 0) return [];

    const rawMembers = await client.mGet(ids.map((id) => this.keyId(id)));
    return rawMembers
      .map((raw) => this.parseMember(raw))
      .filter((member): member is WorkspaceMember => member !== null)
      .sort((a, b) => a.joinedAt - b.joinedAt);
  }

  async listOwners(workspaceId: string): Promise<WorkspaceMember[]> {
    const client = await this.getClient("listOwners");
    const ids = await client.sMembers(this.keyOwners(workspaceId));
    if (ids.length === 0) return [];

    const rawMembers = await client.mGet(ids.map((id) => this.keyId(id)));
    return rawMembers
      .map((raw) => this.parseMember(raw))
      .filter((member): member is WorkspaceMember => member !== null)
      .sort((a, b) => a.joinedAt - b.joinedAt);
  }

  async countOwners(workspaceId: string): Promise<number> {
    const client = await this.getClient("countOwners");
    return client.sCard(this.keyOwners(workspaceId));
  }

  async updateRole(
    id: string,
    newRole: MemberRole,
    changedBy: string
  ): Promise<void> {
    const client = await this.getClient("updateRole");
    let workspaceId = "unknown";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const existing = await this.readMemberById(id);
      if (!existing) throw new MemberNotFoundError(id);
      workspaceId = existing.workspaceId;

      if (existing.role === newRole) {
        const sameRole = {
          ...existing,
          lastRoleChangeAt: Date.now(),
          lastRoleChangeBy: changedBy,
        };
        await client.set(this.keyId(id), JSON.stringify(sameRole));
        return;
      }

      const ownersKey = this.keyOwners(existing.workspaceId);
      await client.watch(ownersKey, this.keyId(id));

      if (existing.role === "owner" && newRole !== "owner") {
        const ownerCount = await client.sCard(ownersKey);
        if (ownerCount <= 1) {
          await client.unwatch();
          throw new LastOwnerInvariantError(existing.workspaceId);
        }
      }

      const updated = {
        ...existing,
        role: newRole,
        lastRoleChangeAt: Date.now(),
        lastRoleChangeBy: changedBy,
      };

      const multi = client.multi();
      if (existing.role === "owner" && newRole !== "owner") {
        multi.sRem(ownersKey, id);
      } else if (existing.role !== "owner" && newRole === "owner") {
        multi.sAdd(ownersKey, id);
      }
      multi.set(this.keyId(id), JSON.stringify(updated));

      const result = await multi.exec();
      if (result !== null) {
        return;
      }
    }

    throw new LastOwnerInvariantError(workspaceId);
  }

  async remove(id: string): Promise<void> {
    const client = await this.getClient("remove");
    let workspaceId = "unknown";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const existing = await this.readMemberById(id);
      if (!existing) throw new MemberNotFoundError(id);
      workspaceId = existing.workspaceId;

      const ownersKey = this.keyOwners(existing.workspaceId);
      await client.watch(ownersKey, this.keyId(id));

      if (existing.role === "owner") {
        const ownerCount = await client.sCard(ownersKey);
        if (ownerCount <= 1) {
          await client.unwatch();
          throw new LastOwnerInvariantError(existing.workspaceId);
        }
      }

      const multi = client.multi();
      if (existing.role === "owner") {
        multi.sRem(ownersKey, id);
      }
      multi.sRem(this.keyWorkspace(existing.workspaceId), id);
      multi.del(this.keyUser(existing.workspaceId, existing.userId));
      multi.del(this.keyId(id));

      const result = await multi.exec();
      if (result !== null) {
        return;
      }
    }

    throw new LastOwnerInvariantError(workspaceId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let _store: WorkspaceMemberStore | null = null;

export function getMemberStore(): WorkspaceMemberStore {
  if (!_store) {
    _store = hasRedisConfigured()
      ? new RedisWorkspaceMemberStore()
      : new MemoryWorkspaceMemberStore();
  }
  return _store;
}

/** For tests only — reset the singleton. */
export async function __resetMemberStoreForTests(): Promise<void> {
  _store = null;
  await __resetRedisClientForTests();
}
