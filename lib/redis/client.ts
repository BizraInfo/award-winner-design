/* eslint-disable no-console */
/**
 * Shared Redis client for invites + workspace members.
 *
 * Mirrors the token-store runtime-only import + reconnect pattern, but keeps
 * the client singleton in one place so stores and tests do not duplicate
 * connection lifecycle logic.
 */

type RedisMulti = {
  set(key: string, value: string): RedisMulti;
  del(...keys: string[]): RedisMulti;
  sAdd(key: string, ...members: string[]): RedisMulti;
  sRem(key: string, ...members: string[]): RedisMulti;
  exec(): Promise<unknown[] | null>;
};

export type RedisClient = {
  connect(): Promise<void>;
  quit(): Promise<void>;
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(...keys: string[]): Promise<number>;
  exists(key: string): Promise<number>;
  mGet(keys: string[]): Promise<Array<string | null>>;
  sAdd(key: string, ...members: string[]): Promise<number>;
  sRem(key: string, ...members: string[]): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  sCard(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
  watch(...keys: string[]): Promise<void>;
  unwatch(): Promise<void>;
  multi(): RedisMulti;
  on(event: "error", handler: (err: Error) => void): void;
  on(event: "connect" | "disconnect", handler: () => void): void;
  on(event: string, handler: (...args: never[]) => void): void;
};

export class RedisUnavailableError extends Error {
  readonly code = "REDIS_UNAVAILABLE" as const;

  constructor(
    public readonly operation: string,
    public readonly detail?: string
  ) {
    super(
      detail
        ? `Redis unavailable for operation: ${operation} (${detail})`
        : `Redis unavailable for operation: ${operation}`
    );
    this.name = "RedisUnavailableError";
  }
}

type RedisImport = {
  createClient: (options: unknown) => RedisClient;
};

let client: RedisClient | null = null;
let initPromise: Promise<void> | null = null;
let connected = false;

async function initRedisClient(): Promise<void> {
  try {
    // Vitest needs a normal dynamic import so the alias to the Redis mock is
    // honored. Production / app runtime keeps the token-store-style runtime
    // import to avoid build-time resolution when Redis is optional.
    const importAtRuntime =
      process.env.VITEST === "true"
        ? ((specifier: string) => import(specifier)) as (
            specifier: string
          ) => Promise<RedisImport>
        : // eslint-disable-next-line no-new-func
          (new Function(
            "specifier",
            "return import(specifier)"
          ) as (specifier: string) => Promise<RedisImport>);
    const redis = await importAtRuntime("redis");

    client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.error("[Redis] Max reconnection attempts reached");
            return new Error("Max reconnection attempts");
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    client.on("error", (err: Error) => {
      console.error("[Redis] Client error:", err.message);
    });

    client.on("connect", () => {
      connected = true;
    });

    client.on("disconnect", () => {
      connected = false;
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.message
        ? error.message
        : "Redis package not installed. Run: pnpm add redis";
    throw new RedisUnavailableError("initialize", detail);
  }
}

export function hasRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export async function getRedisClient(
  operation: string = "unknown"
): Promise<RedisClient> {
  if (!hasRedisConfigured()) {
    throw new RedisUnavailableError(operation, "REDIS_URL is not configured");
  }

  if (!client) {
    if (!initPromise) {
      initPromise = initRedisClient();
    }
    try {
      await initPromise;
    } finally {
      initPromise = null;
    }
  }

  // Self-heal: node-redis v4 exposes client.isOpen. After the reconnectStrategy
  // ceiling, the client enters a permanently-closed state and every op throws
  // "The client is closed" — but 'end'/'disconnect' events do NOT fire
  // reliably, so we cannot trust `connected`. Inspect isOpen directly. Mirrors
  // lib/security/token-store.ts (Track B.6 convergence).
  const maybeOpen = client as unknown as { isOpen?: boolean } | null;
  if (client && maybeOpen && maybeOpen.isOpen === false) {
    await __dropRedisSingleton();
    if (!initPromise) {
      initPromise = initRedisClient();
    }
    try {
      await initPromise;
    } finally {
      initPromise = null;
    }
  }

  if (!client) {
    throw new RedisUnavailableError(operation, "Redis client not initialized");
  }

  if (!connected) {
    try {
      await client.connect();
      connected = true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new RedisUnavailableError(operation, detail);
    }
  }

  return client;
}

export async function getRedisHealthStatus(): Promise<
  "ok" | "degraded" | "disabled"
> {
  if (!hasRedisConfigured()) {
    return "disabled";
  }

  try {
    const redis = await getRedisClient("health");
    await redis.ping();
    return "ok";
  } catch {
    // Self-heal: drop the singleton so the next probe re-initialises from
    // scratch. Without this, the node redis client's reconnectStrategy hits
    // its max-retry ceiling during an outage and then stays permanently
    // broken even after Redis recovers — meaning /api/health would report
    // "degraded" forever. This was surfaced by the canary/rollback drill.
    await __dropRedisSingleton();
    return "degraded";
  }
}

// Internal variant of __resetRedisClientForTests that is safe to call from
// production code paths (e.g. the health probe) without tying the logic to
// a VITEST environment check. No-op if no client exists.
async function __dropRedisSingleton(): Promise<void> {
  if (client) {
    try {
      await client.quit();
    } catch {
      // Client was already torn down — that's the state we want.
    }
  }
  client = null;
  initPromise = null;
  connected = false;
}

export function isRedisUnavailableError(
  error: unknown
): error is RedisUnavailableError {
  return error instanceof RedisUnavailableError;
}

/**
 * Test-only. Closes the shared Redis client and clears singleton state so the
 * next getRedisClient() call reconnects cleanly.
 */
export async function __resetRedisClientForTests(): Promise<void> {
  if (client) {
    try {
      await client.quit();
    } catch {
      // Ignore shutdown failures in tests; the goal is to drop the singleton.
    }
  }
  client = null;
  initPromise = null;
  connected = false;
}
