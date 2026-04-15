# Copilot Workspace Instructions — award-winner-design

## Project Overview

Next.js 16 (App Router) sovereign identity platform with Redis-backed persistence,
JWT auth (jose), Zustand state management, Three.js 3D visuals, and Tailwind CSS 4.
Package manager: **pnpm** (≥ 10). Node: **≥ 20**. TypeScript: **strict mode**.

## Architecture

```
app/           → Next.js App Router (pages + API routes)
components/    → React components by feature domain
lib/           → Core logic: security/, redis/, validation/, events/, etc.
store/         → Zustand stores (use-bizra-store, use-lifecycle-store, use-terminal-store)
hooks/         → Custom React hooks (use- prefix, kebab-case)
tests/         → unit/, integration/, e2e/, k6/
scripts/       → Operational scripts (drill scripts, deploy helpers)
docs/          → Calibration receipts, specs
middleware.ts  → Edge Runtime: JWT verify, CSRF, rate limiting
```

## Code Conventions

### Imports & Paths
- Use the `@/` alias for all project imports: `import { cn } from "@/lib/utils"`
- Never use relative imports that climb more than one level (`../../` is the max)

### File Naming
- **Components**: PascalCase (`Hero.tsx`, `LifecycleRouter.tsx`)
- **Stores/Hooks**: kebab-case with `use-` prefix (`use-bizra-store.ts`)
- **Lib modules**: kebab-case (`token-store.ts`, `api-auth.ts`)
- **API routes**: `app/api/[domain]/[resource]/route.ts`

### Components
- Functional components only. No class components.
- Server Components by default; add `"use client"` only when needed.
- Use `cn()` from `@/lib/utils` to merge Tailwind classes conditionally.
- Animations via Framer Motion (`motion.div`, not CSS transitions).

### State Management
- Zustand with `subscribeWithSelector` middleware.
- Export granular selector hooks (`usePhase`, `usePoi`) to prevent re-renders.
- Never access stores directly in server components.

### Error Handling
- Custom error classes with a `.code` readonly property (e.g. `RedisUnavailableError`).
- Throw typed errors; catch with `instanceof` checks, not string matching.
- Error boundaries for component trees; API routes return structured JSON errors.

## Security (Mandatory)

- **JWT**: 15-min access tokens, 7-day refresh tokens. Signed with `jose` (Edge-safe).
- **CSRF**: Web Crypto API only — no Node.js `crypto` in middleware (Edge Runtime).
- **Rate limiting**: 60 req/min default. Inline in `middleware.ts`.
- **Secrets**: Lazy-init, env-required, 32-char minimum. Never log credentials.
- **Redis auth tokens**: Stored in `RedisTokenStore`; in-memory fallback in dev.
- **middleware.ts** runs in Edge Runtime — never import modules that require Node.js APIs.

## Redis Patterns

Both Redis clients use `isOpen` probe self-heal:

- **`lib/redis/client.ts`** — Business-layer singleton for workspace data.
  - `getRedisClient(operation)` checks `client.isOpen === false` → drops singleton → re-inits.
  - `__dropRedisSingleton()` for internal teardown; `__resetRedisClientForTests()` for tests.
- **`lib/security/token-store.ts`** — Auth-layer client for JWT revocation.
  - `getClient()` checks `isOpen === false` → quit → re-init from stored `redisUrl`.
  - Also listens for `'end'` event as a secondary signal.

When modifying Redis code: both clients MUST stay converged on the `isOpen` probe pattern.

## Testing

- **Framework**: Vitest 1.6 + @testing-library/react 15.
- **Unit tests**: `tests/unit/` — run with `pnpm vitest run` (jsdom env by default).
- **Node-env tests**: Add `// @vitest-environment node` at top of file.
- **Redis mock**: `tests/unit/mocks/redis.ts` — aliased via `vitest.config.ts` resolve.
- **Integration tests**: `TEST_WITH_REDIS=1 pnpm vitest run` (uses real Redis).
- Test file naming: `<module>.test.ts` collocated in `tests/unit/<domain>/`.
- Self-heal tests exist for both Redis clients — do not remove them.

## What NOT to Do

- Do NOT use `require()` — ESM only (`import`).
- Do NOT add Node.js-only APIs to `middleware.ts` (it's Edge Runtime).
- Do NOT create new Redis client instances — use the shared singletons.
- Do NOT mock Redis in integration tests (`TEST_WITH_REDIS=1`).
- Do NOT bypass CSRF protection in API routes (except public paths in `PUBLIC_API_PATHS`).
- Do NOT use `any` — use `unknown` + type narrowing instead.
- Do NOT commit secrets, tokens, or API keys. Use environment variables.

## Build & Run

```bash
pnpm install          # Install deps
pnpm dev              # Dev server (port 3005 typical)
pnpm build            # Production build (standalone output)
pnpm vitest run       # Unit tests
pnpm tsc --noEmit     # Type check
```

## Docker Redis (Development)

```bash
docker run -d --name redis-b3-test -p 6379:6379 \
  -v redis-b3-data:/data redis:7-alpine \
  redis-server --appendonly yes
```

Set `REDIS_URL=redis://localhost:6379` in `.env.local`.
