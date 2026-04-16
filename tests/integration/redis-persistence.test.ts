// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";

const describeIfRedis =
  process.env.TEST_WITH_REDIS === "1" ? describe : describe.skip;

function requireRedisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

describeIfRedis("Redis persistence substrate", () => {
  beforeEach(async () => {
    process.env.REDIS_URL = requireRedisUrl();
    vi.resetModules();

    const inviteModule = await import("../../lib/invites/invite-store");
    await inviteModule.__resetInviteStoreForTests();

    const memberModule = await import("../../lib/members/member-store");
    await memberModule.__resetMemberStoreForTests();

    // Flush Redis between tests so workspace keys from prior tests don't
    // cause DuplicateMembershipError or stale owner counts.
    const { createClient } = await import("redis");
    const flush = createClient({ url: requireRedisUrl() });
    await flush.connect();
    await flush.flushDb();
    await flush.quit();
  });

  it("round-trips invites and members through Redis", async () => {
    const inviteModule = await import("../../lib/invites/invite-store");
    const memberModule = await import("../../lib/members/member-store");

    const inviteStore = inviteModule.getInviteStore();
    const memberStore = memberModule.getMemberStore();

    const inviteId = randomUUID();
    const memberId = randomUUID();

    await inviteStore.create({
      id: inviteId,
      workspaceId: "ws-redis",
      email: "invite@test.com",
      role: "member",
      tokenHash: "hash-redis",
      status: "pending",
      invitedBy: "owner-1",
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      resentCount: 0,
    });

    await memberStore.add({
      id: memberId,
      workspaceId: "ws-redis",
      userId: "user-1",
      email: "member@test.com",
      role: "owner",
      joinedAt: Date.now(),
    });

    expect((await inviteStore.getById(inviteId))?.email).toBe("invite@test.com");
    expect((await inviteStore.getByTokenHash("hash-redis"))?.id).toBe(inviteId);
    expect((await memberStore.getByUserAndWorkspace("ws-redis", "user-1"))?.id).toBe(
      memberId
    );
    expect(await memberStore.countOwners("ws-redis")).toBe(1);
  });

  it("survives client reset / reconnect with the same REDIS_URL", async () => {
    const inviteModule = await import("../../lib/invites/invite-store");
    const memberModule = await import("../../lib/members/member-store");
    const redisModule = await import("../../lib/redis/client");

    const inviteStore = inviteModule.getInviteStore();
    const memberStore = memberModule.getMemberStore();

    const inviteId = randomUUID();
    const memberId = randomUUID();

    await inviteStore.create({
      id: inviteId,
      workspaceId: "ws-restart",
      email: "persist@test.com",
      role: "admin",
      tokenHash: "hash-restart",
      status: "pending",
      invitedBy: "owner-1",
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      resentCount: 0,
    });

    await memberStore.add({
      id: memberId,
      workspaceId: "ws-restart",
      userId: "user-restart",
      email: "owner@test.com",
      role: "owner",
      joinedAt: Date.now(),
    });

    await redisModule.__resetRedisClientForTests();
    await inviteModule.__resetInviteStoreForTests();
    await memberModule.__resetMemberStoreForTests();

    const reloadedInviteStore = inviteModule.getInviteStore();
    const reloadedMemberStore = memberModule.getMemberStore();

    expect((await reloadedInviteStore.getById(inviteId))?.tokenHash).toBe(
      "hash-restart"
    );
    expect((await reloadedMemberStore.getById(memberId))?.email).toBe(
      "owner@test.com"
    );
  });

  it("protects the last-owner invariant across two store instances", async () => {
    const firstModule = await import("../../lib/members/member-store");
    const storeA = firstModule.getMemberStore();

    await vi.resetModules();
    process.env.REDIS_URL = requireRedisUrl();
    const secondModule = await import("../../lib/members/member-store");
    const storeB = secondModule.getMemberStore();

    const wsId = `ws-concurrent-${randomUUID().slice(0, 8)}`;
    const ownerA = {
      id: randomUUID(),
      workspaceId: wsId,
      userId: `owner-a-${randomUUID().slice(0, 8)}`,
      email: "a@test.com",
      role: "owner" as const,
      joinedAt: Date.now(),
    };
    const ownerB = {
      id: randomUUID(),
      workspaceId: wsId,
      userId: `owner-b-${randomUUID().slice(0, 8)}`,
      email: "b@test.com",
      role: "owner" as const,
      joinedAt: Date.now(),
      invitedBy: ownerA.id,
      inviteId: randomUUID(),
    };

    await storeA.add(ownerA);
    await storeA.add(ownerB);

    const [removeA, removeB] = await Promise.allSettled([
      storeA.remove(ownerA.id),
      storeB.remove(ownerB.id),
    ]);

    const fulfilled = [removeA, removeB].filter(
      (result) => result.status === "fulfilled"
    );
    const rejected = [removeA, removeB].filter(
      (result) => result.status === "rejected"
    ) as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason?.name).toBe("LastOwnerInvariantError");
  });
});
