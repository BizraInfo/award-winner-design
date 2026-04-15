// @vitest-environment node
/**
 * Locks the self-heal branch in lib/redis/client.ts: when node-redis's
 * reconnectStrategy ceiling is hit and isOpen === false, getRedisClient()
 * MUST drop the singleton and re-initialise so the next call gets a fresh
 * client — not "The client is closed".
 *
 * Integration proof lives in scripts/verify-canary-rollback-drill.sh; this
 * unit test locks the behavior at the module level so a refactor can't
 * silently regress it.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getRedisClient,
  __resetRedisClientForTests,
} from "../../../lib/redis/client";
import { __resetRedisMock } from "../mocks/redis";

describe("Redis client singleton — self-heal", () => {
  beforeEach(() => {
    process.env.REDIS_URL = "redis://localhost:6379";
    __resetRedisMock();
  });

  afterEach(async () => {
    await __resetRedisClientForTests();
    __resetRedisMock();
    delete process.env.REDIS_URL;
  });

  it("replaces a permanently-closed singleton (isOpen=false) with a fresh one", async () => {
    // Boot the singleton.
    const original = await getRedisClient("test-init");
    expect(original).toBeTruthy();

    // Simulate the post-ceiling state: node-redis gave up, client.isOpen is
    // false. The module inspects this via `as unknown as { isOpen?: boolean }`.
    (original as unknown as { isOpen: boolean }).isOpen = false;

    // Next call should detect the dead client, drop it, and re-init.
    const replacement = await getRedisClient("test-selfheal");

    expect(replacement).toBeTruthy();
    expect(replacement).not.toBe(original);
  });

  it("reuses a healthy singleton (no isOpen=false)", async () => {
    const first = await getRedisClient("test-a");
    const second = await getRedisClient("test-b");

    // Same singleton instance — no self-heal triggered.
    expect(second).toBe(first);
  });
});
