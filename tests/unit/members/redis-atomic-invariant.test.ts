// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import {
  __resetMemberStoreForTests,
  getMemberStore,
  type WorkspaceMember,
} from "../../../lib/members/member-store";
import { LastOwnerInvariantError } from "../../../lib/members/errors";
import {
  __resetRedisMock,
  __setRedisExecResponses,
} from "../mocks/redis";

function makeOwner(overrides: Partial<WorkspaceMember> = {}): WorkspaceMember {
  return {
    id: randomUUID(),
    workspaceId: "ws-atomic",
    userId: `u-${randomUUID().slice(0, 8)}`,
    email: `owner-${randomUUID().slice(0, 4)}@example.com`,
    role: "owner",
    joinedAt: Date.now(),
    ...overrides,
  };
}

describe("MemberStore — Redis atomic last-owner invariant", () => {
  beforeEach(async () => {
    process.env.REDIS_URL = "redis://unit-test";
    __resetRedisMock();
    await __resetMemberStoreForTests();
  });

  it("fails closed when EXEC returns null three times during owner demotion", async () => {
    const store = getMemberStore();
    // ownerA is the genesis owner (no inviter). ownerB joins via invite so the
    // genesis uniqueness check does not block the second owner add.
    const ownerA = makeOwner({ workspaceId: "ws-atomic", userId: "owner-a" });
    const ownerB = makeOwner({
      workspaceId: "ws-atomic",
      userId: "owner-b",
      invitedBy: ownerA.id,
      inviteId: "test-invite-ownerB",
    });

    await store.add(ownerA);
    await store.add(ownerB);

    // Three consecutive EXEC-null responses simulate optimistic-lock contention.
    // Per spec §6.4 the store must retry up to 3 times then fail closed.
    __setRedisExecResponses([null, null, null]);

    await expect(
      store.updateRole(ownerA.id, "admin", "system")
    ).rejects.toBeInstanceOf(LastOwnerInvariantError);
  });
});
