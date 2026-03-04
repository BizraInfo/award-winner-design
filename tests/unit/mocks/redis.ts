// tests/unit/mocks/redis.ts
// Mock redis module for Vitest — prevents build-time resolution failure.
// The real RedisTokenStore is never exercised in unit tests;
// token-store.ts falls back to MemoryTokenStore when Redis is unavailable.

export function createClient() {
  return {
    connect: async () => {},
    quit: async () => {},
    setEx: async () => {},
    get: async () => null,
    del: async () => 0,
    exists: async () => 0,
    sAdd: async () => 0,
    sRem: async () => 0,
    sMembers: async () => [] as string[],
    expire: async () => false,
    on: () => {},
  };
}
