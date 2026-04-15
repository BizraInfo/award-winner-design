// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import {
  __resetMemberStoreForTests,
  getMemberStore,
  type WorkspaceMember,
  type MemberRole,
} from "../../../lib/members/member-store";
import {
  LastOwnerInvariantError,
  DuplicateMembershipError,
  MemberNotFoundError,
} from "../../../lib/members/errors";
import {
  canManageMembers,
  canViewMembers,
  canAssignMemberRole,
  canRemoveMemberWithRole,
} from "../../../lib/members/permissions";
import type { UserPayload } from "../../../lib/security/api-auth";
import {
  __getRedisOperations,
  __resetRedisMock,
} from "../mocks/redis";

function makeMember(overrides: Partial<WorkspaceMember> = {}): WorkspaceMember {
  return {
    id: randomUUID(),
    workspaceId: "ws-test",
    userId: `u-${randomUUID().slice(0, 8)}`,
    email: `user-${randomUUID().slice(0, 4)}@example.com`,
    role: "member",
    joinedAt: Date.now(),
    ...overrides,
  };
}

describe("MemberStore — CRUD", () => {
  beforeEach(async () => {
    delete process.env.REDIS_URL;
    __resetRedisMock();
    await __resetMemberStoreForTests();
  });

  it("adds and retrieves a member by id", async () => {
    const store = getMemberStore();
    const m = makeMember({ role: "admin" });
    await store.add(m);
    const found = await store.getById(m.id);
    expect(found).not.toBeNull();
    expect(found!.email).toBe(m.email);
    expect(found!.role).toBe("admin");
  });

  it("returns null for unknown id", async () => {
    const store = getMemberStore();
    expect(await store.getById("nope")).toBeNull();
  });

  it("finds by (workspaceId, userId)", async () => {
    const store = getMemberStore();
    const m = makeMember({ workspaceId: "ws-a", userId: "u-1" });
    await store.add(m);
    const found = await store.getByUserAndWorkspace("ws-a", "u-1");
    expect(found?.id).toBe(m.id);
    expect(await store.getByUserAndWorkspace("ws-a", "u-2")).toBeNull();
    expect(await store.getByUserAndWorkspace("ws-b", "u-1")).toBeNull();
  });

  it("lists members by workspace, sorted by joinedAt asc", async () => {
    const store = getMemberStore();
    const a = makeMember({ workspaceId: "ws-x", joinedAt: 2000, email: "a@x.com", userId: "ua" });
    const b = makeMember({ workspaceId: "ws-x", joinedAt: 1000, email: "b@x.com", userId: "ub" });
    await store.add(a);
    await store.add(b);
    const list = await store.listByWorkspace("ws-x");
    expect(list.map((m) => m.email)).toEqual(["b@x.com", "a@x.com"]);
  });
});

describe("MemberStore — Uniqueness", () => {
  beforeEach(async () => {
    delete process.env.REDIS_URL;
    __resetRedisMock();
    await __resetMemberStoreForTests();
  });

  it("blocks duplicate (workspaceId, userId) with DuplicateMembershipError", async () => {
    const store = getMemberStore();
    await store.add(makeMember({ workspaceId: "ws-d", userId: "u-d", email: "d@x.com" }));
    await expect(
      store.add(makeMember({ workspaceId: "ws-d", userId: "u-d", email: "d@x.com" }))
    ).rejects.toBeInstanceOf(DuplicateMembershipError);
  });

  it("same userId in different workspace is allowed", async () => {
    const store = getMemberStore();
    await store.add(makeMember({ workspaceId: "ws-1", userId: "u-shared" }));
    await expect(
      store.add(makeMember({ workspaceId: "ws-2", userId: "u-shared" }))
    ).resolves.toBeUndefined();
  });
});

describe("MemberStore — Last-Owner Invariant", () => {
  beforeEach(async () => {
    delete process.env.REDIS_URL;
    __resetRedisMock();
    await __resetMemberStoreForTests();
  });

  it("blocks demoting the sole owner via updateRole", async () => {
    const store = getMemberStore();
    const owner = makeMember({ workspaceId: "ws-lo", role: "owner" });
    await store.add(owner);

    await expect(store.updateRole(owner.id, "admin", "system")).rejects.toBeInstanceOf(
      LastOwnerInvariantError
    );

    const stillOwner = await store.getById(owner.id);
    expect(stillOwner!.role).toBe("owner");
  });

  it("blocks removing the sole owner", async () => {
    const store = getMemberStore();
    const owner = makeMember({ workspaceId: "ws-ro", role: "owner" });
    await store.add(owner);

    await expect(store.remove(owner.id)).rejects.toBeInstanceOf(
      LastOwnerInvariantError
    );
    expect(await store.getById(owner.id)).not.toBeNull();
  });

  it("allows demoting when another owner exists", async () => {
    const store = getMemberStore();
    const a = makeMember({ workspaceId: "ws-2o", role: "owner", userId: "ua" });
    const b = makeMember({ workspaceId: "ws-2o", role: "owner", userId: "ub" });
    await store.add(a);
    await store.add(b);

    await expect(store.updateRole(a.id, "admin", "ub")).resolves.toBeUndefined();
    expect((await store.getById(a.id))!.role).toBe("admin");
    expect(await store.countOwners("ws-2o")).toBe(1);
  });

  it("allows removing an owner when another remains, then protects the remaining owner", async () => {
    const store = getMemberStore();
    const a = makeMember({ workspaceId: "ws-rm", role: "owner", userId: "ua" });
    const b = makeMember({ workspaceId: "ws-rm", role: "owner", userId: "ub" });
    await store.add(a);
    await store.add(b);

    await store.remove(a.id);
    expect(await store.countOwners("ws-rm")).toBe(1);

    // Now b is the last owner — protected
    await expect(store.remove(b.id)).rejects.toBeInstanceOf(LastOwnerInvariantError);
    await expect(store.updateRole(b.id, "member", "system")).rejects.toBeInstanceOf(
      LastOwnerInvariantError
    );
  });

  it("non-owner removal never trips the invariant", async () => {
    const store = getMemberStore();
    const owner = makeMember({ workspaceId: "ws-nm", role: "owner", userId: "uo" });
    const mem = makeMember({ workspaceId: "ws-nm", role: "member", userId: "um" });
    await store.add(owner);
    await store.add(mem);
    await expect(store.remove(mem.id)).resolves.toBeUndefined();
  });

  it("updateRole to the same owner role on a sole owner is a no-op (not a demotion)", async () => {
    const store = getMemberStore();
    const owner = makeMember({ workspaceId: "ws-self", role: "owner" });
    await store.add(owner);
    await expect(store.updateRole(owner.id, "owner", "self")).resolves.toBeUndefined();
  });
});

describe("MemberStore — MemberNotFound", () => {
  beforeEach(async () => {
    delete process.env.REDIS_URL;
    __resetRedisMock();
    await __resetMemberStoreForTests();
  });

  it("updateRole on unknown id throws MemberNotFoundError", async () => {
    const store = getMemberStore();
    await expect(
      store.updateRole("nope", "admin", "system")
    ).rejects.toBeInstanceOf(MemberNotFoundError);
  });

  it("remove on unknown id throws MemberNotFoundError", async () => {
    const store = getMemberStore();
    await expect(store.remove("nope")).rejects.toBeInstanceOf(MemberNotFoundError);
  });
});

describe("Member Permissions", () => {
  const owner: UserPayload = { sub: "o", email: "o@x.com", roles: ["owner"], permissions: [] };
  const admin: UserPayload = { sub: "a", email: "a@x.com", roles: ["admin"], permissions: [] };
  const member: UserPayload = { sub: "m", email: "m@x.com", roles: ["member"], permissions: [] };
  const viewer: UserPayload = { sub: "v", email: "v@x.com", roles: ["viewer"], permissions: [] };

  it("canManageMembers: owner + admin yes; member/viewer no", () => {
    expect(canManageMembers(owner)).toBe(true);
    expect(canManageMembers(admin)).toBe(true);
    expect(canManageMembers(member)).toBe(false);
    expect(canManageMembers(viewer)).toBe(false);
  });

  it("canViewMembers: owner/admin/member yes; viewer no", () => {
    expect(canViewMembers(owner)).toBe(true);
    expect(canViewMembers(admin)).toBe(true);
    expect(canViewMembers(member)).toBe(true);
    expect(canViewMembers(viewer)).toBe(false);
  });

  it("canAssignMemberRole: owner grants any; admin CANNOT grant owner", () => {
    expect(canAssignMemberRole(["owner"], "owner")).toBe(true);
    expect(canAssignMemberRole(["owner"], "admin")).toBe(true);
    expect(canAssignMemberRole(["admin"], "admin")).toBe(true);
    expect(canAssignMemberRole(["admin"], "owner")).toBe(false);
    expect(canAssignMemberRole(["member"], "member")).toBe(false);
  });

  it("canRemoveMemberWithRole: admin cannot remove owner; owner can remove anyone", () => {
    expect(canRemoveMemberWithRole(["owner"], "owner")).toBe(true);
    expect(canRemoveMemberWithRole(["owner"], "admin")).toBe(true);
    expect(canRemoveMemberWithRole(["admin"], "admin")).toBe(true);
    expect(canRemoveMemberWithRole(["admin"], "owner")).toBe(false);
    expect(canRemoveMemberWithRole(["member"], "member")).toBe(false);
  });
});

describe("MemberStore — Redis key design", () => {
  beforeEach(async () => {
    process.env.REDIS_URL = "redis://unit-test";
    __resetRedisMock();
    await __resetMemberStoreForTests();
  });

  it("uses canonical member Redis keys for add + owner index lookups", async () => {
    const store = getMemberStore();
    const owner = makeMember({
      id: "member-1",
      workspaceId: "ws-redis",
      userId: "user-1",
      email: "owner@test.com",
      role: "owner",
    });

    await store.add(owner);
    await store.getByUserAndWorkspace(owner.workspaceId, owner.userId);
    await store.countOwners(owner.workspaceId);

    const ops = __getRedisOperations();
    expect(ops.some((op) => op.args.includes("bizra:members:id:member-1"))).toBe(
      true
    );
    expect(
      ops.some((op) =>
        op.args.includes("bizra:members:user:ws-redis:user-1")
      )
    ).toBe(true);
    expect(
      ops.some((op) => op.args.includes("bizra:members:workspace:ws-redis"))
    ).toBe(true);
    expect(
      ops.some((op) => op.args.includes("bizra:members:owners:ws-redis"))
    ).toBe(true);
  });
});
