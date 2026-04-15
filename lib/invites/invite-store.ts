// lib/invites/invite-store.ts
/**
 * Invite Store — In-memory (dev) + Redis-ready (prod) data layer.
 * Mirrors the token-store.ts pattern: no ORM, same interface contract.
 */

import {
  __resetRedisClientForTests,
  getRedisClient,
  hasRedisConfigured,
} from "@/lib/redis/client";

export type InviteRole = 'owner' | 'admin' | 'member' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: InviteRole;
  tokenHash: string;
  status: InviteStatus;
  invitedBy: string;        // userId of inviter
  createdAt: number;        // epoch ms
  expiresAt: number;        // epoch ms
  acceptedAt?: number;
  acceptedBy?: string;      // userId of accepter
  resentAt?: number;
  resentCount: number;
}

export interface InviteStore {
  create(invite: WorkspaceInvite): Promise<void>;
  getById(id: string): Promise<WorkspaceInvite | null>;
  getByTokenHash(tokenHash: string): Promise<WorkspaceInvite | null>;
  listByWorkspace(workspaceId: string): Promise<WorkspaceInvite[]>;
  update(id: string, patch: Partial<WorkspaceInvite>): Promise<void>;
  delete(id: string): Promise<void>;
}

export type DuplicatePendingInviteError = Error & {
  code: "DUPLICATE_PENDING_INVITE";
  workspaceId: string;
  email: string;
};

function duplicatePendingInviteError(
  workspaceId: string,
  email: string
): DuplicatePendingInviteError {
  const error = new Error(
    `A pending invite already exists for ${email} in workspace ${workspaceId}`
  ) as DuplicatePendingInviteError;
  error.name = "DuplicatePendingInviteError";
  error.code = "DUPLICATE_PENDING_INVITE";
  error.workspaceId = workspaceId;
  error.email = email;
  return error;
}

export function isDuplicatePendingInviteError(
  error: unknown
): error is DuplicatePendingInviteError {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code === "DUPLICATE_PENDING_INVITE"
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE (Development)
// ═══════════════════════════════════════════════════════════════════════════════

class MemoryInviteStore implements InviteStore {
  private invites = new Map<string, WorkspaceInvite>();

  async create(invite: WorkspaceInvite): Promise<void> {
    this.invites.set(invite.id, { ...invite });
  }

  async getById(id: string): Promise<WorkspaceInvite | null> {
    return this.invites.get(id) ?? null;
  }

  async getByTokenHash(tokenHash: string): Promise<WorkspaceInvite | null> {
    for (const invite of this.invites.values()) {
      if (invite.tokenHash === tokenHash) return { ...invite };
    }
    return null;
  }

  async listByWorkspace(workspaceId: string): Promise<WorkspaceInvite[]> {
    const results: WorkspaceInvite[] = [];
    for (const invite of this.invites.values()) {
      if (invite.workspaceId === workspaceId) {
        results.push({ ...invite });
      }
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  async update(id: string, patch: Partial<WorkspaceInvite>): Promise<void> {
    const existing = this.invites.get(id);
    if (!existing) throw new Error(`Invite ${id} not found`);
    this.invites.set(id, { ...existing, ...patch, id }); // id is immutable
  }

  async delete(id: string): Promise<void> {
    this.invites.delete(id);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS STORE (Production / cross-instance durability)
// ═══════════════════════════════════════════════════════════════════════════════

class RedisInviteStore implements InviteStore {
  private keyId(id: string): string {
    return `bizra:invites:id:${id}`;
  }

  private keyHash(tokenHash: string): string {
    return `bizra:invites:hash:${tokenHash}`;
  }

  private keyWorkspace(workspaceId: string): string {
    return `bizra:invites:workspace:${workspaceId}`;
  }

  private async getClient(operation: string) {
    return getRedisClient(`invite-store:${operation}`);
  }

  private parseInvite(raw: string | null): WorkspaceInvite | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WorkspaceInvite;
    } catch {
      return null;
    }
  }

  async create(invite: WorkspaceInvite): Promise<void> {
    const client = await this.getClient("create");
    const workspaceKey = this.keyWorkspace(invite.workspaceId);
    const now = Date.now();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await client.watch(workspaceKey);

      const existingInvites = await this.listByWorkspace(invite.workspaceId);
      const duplicate = existingInvites.find(
        (existing) =>
          existing.email === invite.email &&
          existing.status === "pending" &&
          existing.expiresAt > now
      );

      if (duplicate) {
        await client.unwatch();
        throw duplicatePendingInviteError(invite.workspaceId, invite.email);
      }

      const multi = client.multi();
      multi.set(this.keyId(invite.id), JSON.stringify(invite));
      multi.set(this.keyHash(invite.tokenHash), invite.id);
      multi.sAdd(workspaceKey, invite.id);

      const result = await multi.exec();
      if (result !== null) {
        return;
      }
    }

    throw duplicatePendingInviteError(invite.workspaceId, invite.email);
  }

  async getById(id: string): Promise<WorkspaceInvite | null> {
    const client = await this.getClient("getById");
    return this.parseInvite(await client.get(this.keyId(id)));
  }

  async getByTokenHash(tokenHash: string): Promise<WorkspaceInvite | null> {
    const client = await this.getClient("getByTokenHash");
    const inviteId = await client.get(this.keyHash(tokenHash));
    if (!inviteId) return null;
    return this.parseInvite(await client.get(this.keyId(inviteId)));
  }

  async listByWorkspace(workspaceId: string): Promise<WorkspaceInvite[]> {
    const client = await this.getClient("listByWorkspace");
    const ids = await client.sMembers(this.keyWorkspace(workspaceId));
    if (ids.length === 0) return [];

    const rawInvites = await client.mGet(ids.map((id) => this.keyId(id)));
    return rawInvites
      .map((raw) => this.parseInvite(raw))
      .filter((invite): invite is WorkspaceInvite => invite !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async update(id: string, patch: Partial<WorkspaceInvite>): Promise<void> {
    const client = await this.getClient("update");
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Invite ${id} not found`);

    const updated: WorkspaceInvite = { ...existing, ...patch, id };
    const multi = client.multi();
    multi.set(this.keyId(id), JSON.stringify(updated));

    if (existing.tokenHash !== updated.tokenHash) {
      multi.del(this.keyHash(existing.tokenHash));
      multi.set(this.keyHash(updated.tokenHash), id);
    }

    const result = await multi.exec();
    if (result === null) {
      throw new Error(`Invite ${id} update failed due to concurrent write`);
    }
  }

  async delete(id: string): Promise<void> {
    const client = await this.getClient("delete");
    const existing = await this.getById(id);
    if (!existing) return;

    const multi = client.multi();
    multi.del(this.keyId(id), this.keyHash(existing.tokenHash));
    multi.sRem(this.keyWorkspace(existing.workspaceId), id);
    await multi.exec();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let _store: InviteStore | null = null;

export function getInviteStore(): InviteStore {
  if (!_store) {
    _store = hasRedisConfigured() ? new RedisInviteStore() : new MemoryInviteStore();
  }
  return _store;
}

/** For tests only — reset singleton and shared Redis client. */
export async function __resetInviteStoreForTests(): Promise<void> {
  _store = null;
  await __resetRedisClientForTests();
}
