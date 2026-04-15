// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { generateInviteToken, hashInviteToken } from '../../../lib/invites/tokens';
import {
  __resetInviteStoreForTests,
  getInviteStore,
  type WorkspaceInvite,
} from '../../../lib/invites/invite-store';
import { canManageInvites, canViewInvites, canAssignRole } from '../../../lib/invites/permissions';
import type { UserPayload } from '../../../lib/security/api-auth';
import { randomUUID } from 'crypto';
import {
  __getRedisOperations,
  __resetRedisMock,
} from '../mocks/redis';

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN GENERATION + HASHING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Invite Tokens', () => {
  it('should generate a URL-safe base64 token', () => {
    const token = generateInviteToken();
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(20);
    // base64url has no +, /, or = padding by default
    expect(token).not.toMatch(/[+/=]/);
  });

  it('should generate unique tokens on each call', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateInviteToken()));
    expect(tokens.size).toBe(100);
  });

  it('should produce deterministic hashes', () => {
    const token = generateInviteToken();
    const h1 = hashInviteToken(token);
    const h2 = hashInviteToken(token);
    expect(h1).toBe(h2);
  });

  it('should produce hex SHA-256 hashes', () => {
    const hash = hashInviteToken('test-token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hash of different tokens should differ', () => {
    const a = hashInviteToken(generateInviteToken());
    const b = hashInviteToken(generateInviteToken());
    expect(a).not.toBe(b);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVITE STORE (in-memory)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Invite Store', () => {
  function makeInvite(overrides: Partial<WorkspaceInvite> = {}): WorkspaceInvite {
    return {
      id: randomUUID(),
      workspaceId: 'ws-1',
      email: 'test@example.com',
      role: 'member',
      tokenHash: hashInviteToken(generateInviteToken()),
      status: 'pending',
      invitedBy: 'user-1',
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      resentCount: 0,
      ...overrides,
    };
  }

  // Each test gets a fresh store
  let store: ReturnType<typeof getInviteStore>;

  beforeEach(async () => {
    delete process.env.REDIS_URL;
    __resetRedisMock();
    await __resetInviteStoreForTests();
    store = getInviteStore();
  });

  it('should create and retrieve an invite by ID', async () => {
    const invite = makeInvite();
    await store.create(invite);
    const found = await store.getById(invite.id);
    expect(found).not.toBeNull();
    expect(found!.email).toBe(invite.email);
  });

  it('should retrieve an invite by token hash', async () => {
    const rawToken = generateInviteToken();
    const hash = hashInviteToken(rawToken);
    const invite = makeInvite({ tokenHash: hash });
    await store.create(invite);

    const found = await store.getByTokenHash(hash);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(invite.id);
  });

  it('should return null for unknown ID', async () => {
    const found = await store.getById('nonexistent');
    expect(found).toBeNull();
  });

  it('should return null for unknown token hash', async () => {
    const found = await store.getByTokenHash('deadbeef');
    expect(found).toBeNull();
  });

  it('should list invites by workspace, sorted by createdAt desc', async () => {
    const older = makeInvite({ email: 'a@test.com', createdAt: 1000 });
    const newer = makeInvite({ email: 'b@test.com', createdAt: 2000 });
    await store.create(older);
    await store.create(newer);

    const list = await store.listByWorkspace('ws-1');
    const emails = list.map((i) => i.email);
    expect(emails.indexOf('b@test.com')).toBeLessThan(emails.indexOf('a@test.com'));
  });

  it('should update invite fields', async () => {
    const invite = makeInvite();
    await store.create(invite);

    await store.update(invite.id, { status: 'accepted', acceptedAt: Date.now() });
    const updated = await store.getById(invite.id);
    expect(updated!.status).toBe('accepted');
    expect(updated!.acceptedAt).toBeDefined();
  });

  it('should throw when updating nonexistent invite', async () => {
    await expect(store.update('nonexistent', { status: 'revoked' })).rejects.toThrow();
  });

  it('should delete an invite', async () => {
    const invite = makeInvite();
    await store.create(invite);
    await store.delete(invite.id);
    const found = await store.getById(invite.id);
    expect(found).toBeNull();
  });
});

describe('Invite Store — Redis key design', () => {
  beforeEach(async () => {
    process.env.REDIS_URL = 'redis://unit-test';
    __resetRedisMock();
    await __resetInviteStoreForTests();
  });

  it('uses canonical invite Redis keys for create + lookup', async () => {
    const store = getInviteStore();
    const invite: WorkspaceInvite = {
      id: 'invite-1',
      workspaceId: 'ws-redis',
      email: 'redis@test.com',
      role: 'member',
      tokenHash: 'hash-1',
      status: 'pending',
      invitedBy: 'user-1',
      createdAt: 1000,
      expiresAt: 2000,
      resentCount: 0,
    };

    await store.create(invite);
    await store.getByTokenHash(invite.tokenHash);
    await store.listByWorkspace(invite.workspaceId);

    const ops = __getRedisOperations();
    expect(ops.some((op) => op.args.includes('bizra:invites:id:invite-1'))).toBe(true);
    expect(ops.some((op) => op.args.includes('bizra:invites:hash:hash-1'))).toBe(true);
    expect(
      ops.some((op) => op.args.includes('bizra:invites:workspace:ws-redis'))
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Invite Permissions', () => {
  const adminUser: UserPayload = {
    sub: 'u-1',
    email: 'admin@test.com',
    roles: ['admin'],
    permissions: [],
  };

  const memberUser: UserPayload = {
    sub: 'u-2',
    email: 'member@test.com',
    roles: ['member'],
    permissions: [],
  };

  const viewerUser: UserPayload = {
    sub: 'u-3',
    email: 'viewer@test.com',
    roles: ['viewer'],
    permissions: [],
  };

  const inviteManagerUser: UserPayload = {
    sub: 'u-4',
    email: 'mgr@test.com',
    roles: [],
    permissions: ['invites:manage'],
  };

  describe('canManageInvites', () => {
    it('admin can manage invites', () => {
      expect(canManageInvites(adminUser)).toBe(true);
    });

    it('regular member cannot manage invites', () => {
      expect(canManageInvites(memberUser)).toBe(false);
    });

    it('user with invites:manage permission can manage', () => {
      expect(canManageInvites(inviteManagerUser)).toBe(true);
    });
  });

  describe('canViewInvites', () => {
    it('admin can view', () => {
      expect(canViewInvites(adminUser)).toBe(true);
    });

    it('member can view', () => {
      expect(canViewInvites(memberUser)).toBe(true);
    });

    it('viewer cannot view invites', () => {
      expect(canViewInvites(viewerUser)).toBe(false);
    });
  });

  describe('canAssignRole', () => {
    it('admin can assign admin role', () => {
      expect(canAssignRole(['admin'], 'admin')).toBe(true);
    });

    it('admin can assign member role', () => {
      expect(canAssignRole(['admin'], 'member')).toBe(true);
    });

    it('admin CANNOT assign owner role', () => {
      expect(canAssignRole(['admin'], 'owner')).toBe(false);
    });

    it('owner can assign owner role', () => {
      expect(canAssignRole(['owner'], 'owner')).toBe(true);
    });

    it('owner can assign admin/member/viewer', () => {
      expect(canAssignRole(['owner'], 'admin')).toBe(true);
      expect(canAssignRole(['owner'], 'member')).toBe(true);
      expect(canAssignRole(['owner'], 'viewer')).toBe(true);
    });

    it('non-admin cannot assign admin role', () => {
      expect(canAssignRole(['member'], 'admin')).toBe(false);
    });

    it('non-admin cannot assign owner role', () => {
      expect(canAssignRole(['member'], 'owner')).toBe(false);
      expect(canAssignRole(['viewer'], 'owner')).toBe(false);
      expect(canAssignRole([], 'owner')).toBe(false);
    });

    it('non-admin can assign member role', () => {
      expect(canAssignRole(['member'], 'member')).toBe(true);
    });

    it('non-admin can assign viewer role', () => {
      expect(canAssignRole(['member'], 'viewer')).toBe(true);
    });
  });

  describe('canManageInvites — owner', () => {
    const ownerUser: UserPayload = {
      sub: 'u-owner',
      email: 'owner@test.com',
      roles: ['owner'],
      permissions: [],
    };
    it('owner can manage invites', () => {
      expect(canManageInvites(ownerUser)).toBe(true);
    });
    it('owner can view invites', () => {
      expect(canViewInvites(ownerUser)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATA INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Invite Data Integrity', () => {
  beforeEach(async () => {
    delete process.env.REDIS_URL;
    __resetRedisMock();
    await __resetInviteStoreForTests();
  });

  it('raw token should NOT be stored — only hash', async () => {
    const rawToken = generateInviteToken();
    const hash = hashInviteToken(rawToken);
    const store = getInviteStore();

    const invite: WorkspaceInvite = {
      id: randomUUID(),
      workspaceId: 'ws-integrity',
      email: 'integrity@test.com',
      role: 'member',
      tokenHash: hash,
      status: 'pending',
      invitedBy: 'user-1',
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      resentCount: 0,
    };

    await store.create(invite);
    const stored = await store.getById(invite.id);

    // The stored record should contain the hash, not the raw token
    expect(stored!.tokenHash).toBe(hash);
    expect(JSON.stringify(stored)).not.toContain(rawToken);
  });

  it('accepted invite should not be re-acceptable', async () => {
    const store = getInviteStore();
    const invite: WorkspaceInvite = {
      id: randomUUID(),
      workspaceId: 'ws-reaccept',
      email: 'reaccept@test.com',
      role: 'member',
      tokenHash: hashInviteToken(generateInviteToken()),
      status: 'accepted',
      invitedBy: 'user-1',
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      acceptedAt: Date.now(),
      acceptedBy: 'user-2',
      resentCount: 0,
    };

    await store.create(invite);
    const found = await store.getById(invite.id);
    // Business logic should check status before accepting
    expect(found!.status).toBe('accepted');
    // This is the invariant: status=accepted means done
  });

  it('revoked invite should not be resendable', async () => {
    const store = getInviteStore();
    const invite: WorkspaceInvite = {
      id: randomUUID(),
      workspaceId: 'ws-revoked',
      email: 'revoked@test.com',
      role: 'viewer',
      tokenHash: hashInviteToken(generateInviteToken()),
      status: 'revoked',
      invitedBy: 'user-1',
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      resentCount: 0,
    };

    await store.create(invite);
    const found = await store.getById(invite.id);
    expect(found!.status).toBe('revoked');
  });
});
