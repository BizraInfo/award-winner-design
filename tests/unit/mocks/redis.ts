// tests/unit/mocks/redis.ts
// Functional Redis mock for unit tests. This lets Redis-backed stores run
// against an in-memory model when TEST_WITH_REDIS is unset.

type Operation = {
  method: string;
  args: unknown[];
};

const strings = new Map<string, string>();
const sets = new Map<string, Set<string>>();
let operations: Operation[] = [];
let execResponses: Array<unknown[] | null> = [];

function record(method: string, ...args: unknown[]) {
  operations.push({ method, args });
}

function getSet(key: string): Set<string> {
  let set = sets.get(key);
  if (!set) {
    set = new Set<string>();
    sets.set(key, set);
  }
  return set;
}

function applyCommand(method: string, args: unknown[]) {
  switch (method) {
    case "set": {
      strings.set(args[0] as string, args[1] as string);
      return;
    }
    case "del": {
      for (const key of args as string[]) {
        strings.delete(key);
        sets.delete(key);
      }
      return;
    }
    case "sAdd": {
      const [key, ...members] = args as string[];
      const set = getSet(key);
      for (const member of members) set.add(member);
      return;
    }
    case "sRem": {
      const [key, ...members] = args as string[];
      const set = getSet(key);
      for (const member of members) set.delete(member);
      return;
    }
    default:
      throw new Error(`Unsupported Redis multi command in mock: ${method}`);
  }
}

export function __resetRedisMock(): void {
  strings.clear();
  sets.clear();
  operations = [];
  execResponses = [];
}

export function __getRedisOperations(): Operation[] {
  return operations.slice();
}

export function __setRedisExecResponses(
  responses: Array<unknown[] | null>
): void {
  execResponses = responses.slice();
}

export function createClient() {
  return {
    connect: async () => {
      record("connect");
    },
    quit: async () => {
      record("quit");
    },
    ping: async () => {
      record("ping");
      return "PONG";
    },
    setEx: async (key: string, _ttl: number, value: string) => {
      record("setEx", key, _ttl, value);
      strings.set(key, value);
    },
    set: async (key: string, value: string) => {
      record("set", key, value);
      strings.set(key, value);
    },
    get: async (key: string) => {
      record("get", key);
      return strings.get(key) ?? null;
    },
    del: async (...keys: string[]) => {
      record("del", ...keys);
      let deleted = 0;
      for (const key of keys) {
        deleted += strings.delete(key) ? 1 : 0;
        deleted += sets.delete(key) ? 1 : 0;
      }
      return deleted;
    },
    exists: async (key: string) => {
      record("exists", key);
      return strings.has(key) || sets.has(key) ? 1 : 0;
    },
    mGet: async (keys: string[]) => {
      record("mGet", keys);
      return keys.map((key) => strings.get(key) ?? null);
    },
    sAdd: async (key: string, ...members: string[]) => {
      record("sAdd", key, ...members);
      const set = getSet(key);
      let added = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          added += 1;
        }
      }
      return added;
    },
    sRem: async (key: string, ...members: string[]) => {
      record("sRem", key, ...members);
      const set = getSet(key);
      let removed = 0;
      for (const member of members) {
        removed += set.delete(member) ? 1 : 0;
      }
      return removed;
    },
    sMembers: async (key: string) => {
      record("sMembers", key);
      return Array.from(getSet(key));
    },
    sCard: async (key: string) => {
      record("sCard", key);
      return getSet(key).size;
    },
    expire: async (key: string, seconds: number) => {
      record("expire", key, seconds);
      return strings.has(key) || sets.has(key);
    },
    watch: async (...keys: string[]) => {
      record("watch", ...keys);
    },
    unwatch: async () => {
      record("unwatch");
    },
    multi: () => {
      record("multi");
      const commands: Operation[] = [];
      return {
        set(key: string, value: string) {
          commands.push({ method: "set", args: [key, value] });
          return this;
        },
        del(...keys: string[]) {
          commands.push({ method: "del", args: keys });
          return this;
        },
        sAdd(key: string, ...members: string[]) {
          commands.push({ method: "sAdd", args: [key, ...members] });
          return this;
        },
        sRem(key: string, ...members: string[]) {
          commands.push({ method: "sRem", args: [key, ...members] });
          return this;
        },
        async exec() {
          record("exec", commands.map((command) => command.method));
          if (execResponses.length > 0) {
            // Do NOT coerce with ?? [] — queued `null` entries are meaningful
            // (simulating optimistic-lock contention) and must survive the shift.
            const response = execResponses.shift();
            if (response === null) return null;
          }
          for (const command of commands) {
            applyCommand(command.method, command.args);
          }
          return [];
        },
      };
    },
    on: () => {},
  };
}
