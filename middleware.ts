/**
 * Next.js API Middleware — Edge Runtime
 *
 * Architecture note: This file runs at the Edge Runtime which does NOT
 * support Node.js built-in modules (crypto, fs, etc.) or packages that
 * depend on them. Therefore:
 *
 * - JWT verification uses `jose` directly (Edge-compatible) instead of
 *   importing from `lib/security/api-auth.ts` which pulls in `token-store.ts`
 *   → `redis` (Node-only).
 *
 * - CSRF validation uses Web Crypto API (`crypto.subtle.digest`) instead of
 *   importing from `lib/security/csrf-server.ts` which uses Node.js `crypto`
 *   (`crypto.timingSafeEqual`, `crypto.createHash`).
 *
 * - Rate limiting is implemented inline with a Map store instead of importing
 *   from `lib/rate-limit/` which may use Node.js APIs.
 *
 * CSRF config is imported from `csrf-config.ts` (runtime-agnostic, pure data).
 */
import { jwtVerify, type JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_CSRF_CONFIG } from '@/lib/security/csrf-config';

const API_PREFIX = '/api/';
const ACCESS_TOKEN_COOKIE = 'access_token';

const PUBLIC_API_PATHS = new Set<string>([
  '/api/auth/login',
  '/api/csrf-token',
  '/api/health',
  '/api/scaffold/health',
  '/api/scaffold/metrics',
  '/api/scaffold/evidence',
  '/api/ethics',
]);

const API_RATE_LIMIT = { max: 60, windowMs: 60_000 };
const AUTH_RATE_LIMIT = { max: 5, windowMs: 15 * 60_000 };

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateBucket>();

function isApiRequest(pathname: string): boolean {
  return pathname.startsWith(API_PREFIX);
}

function isMutationMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

function isVerboseHealthRequest(req: NextRequest): boolean {
  const fallbackUrl = new URL(req.url);
  const verbose =
    req.nextUrl.searchParams.get('verbose') === 'true' ||
    fallbackUrl.searchParams.get('verbose') === 'true';
  return (
    req.nextUrl.pathname === '/api/health' &&
    verbose
  );
}

function isPublicRequest(req: NextRequest): boolean {
  if (PUBLIC_API_PATHS.has(req.nextUrl.pathname)) return true;
  if (req.nextUrl.pathname === '/api/health' && !isVerboseHealthRequest(req)) {
    return true;
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getClientKey(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cloudflareIp = req.headers.get('cf-connecting-ip');
  const ip = cloudflareIp || realIp || forwardedFor?.split(',')[0].trim() || 'unknown';
  return `${ip}:${req.nextUrl.pathname}`;
}

function consumeRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { blocked: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { blocked: false, remaining: maxRequests - 1, resetAt };
  }

  if (existing.count >= maxRequests) {
    return {
      blocked: true,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return {
    blocked: false,
    remaining: Math.max(0, maxRequests - existing.count),
    resetAt: existing.resetAt,
  };
}

function getAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies.get(ACCESS_TOKEN_COOKIE)?.value || null;
}

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  const secret = getJwtSecret();

  if (!secret) {
    // Development fallback only.
    if (process.env.NODE_ENV !== 'production') return { sub: 'dev-bypass' };
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

async function validateCsrf(req: NextRequest): Promise<boolean> {
  const headerToken = req.headers.get(DEFAULT_CSRF_CONFIG.headerName);
  const cookieToken = req.cookies.get(DEFAULT_CSRF_CONFIG.cookieName)?.value;
  const cookieHash = req.cookies.get(DEFAULT_CSRF_CONFIG.hashCookieName)?.value;

  if (!headerToken || !cookieToken) {
    return false;
  }
  if (!timingSafeEqual(headerToken, cookieToken)) {
    return false;
  }
  if (cookieHash) {
    const computedHash = await sha256Hex(headerToken);
    if (!timingSafeEqual(computedHash, cookieHash)) {
      return false;
    }
  }
  return true;
}

function attachRateLimitHeaders(
  response: NextResponse,
  maxRequests: number,
  remaining: number,
  resetAt: number
): void {
  response.headers.set('X-RateLimit-Limit', String(maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
}

export async function middleware(req: NextRequest) {
  // Domain redirect: bizra.info → bizra.ai (301 permanent)
  // API routes serve from both domains to avoid breaking clients.
  const host = req.headers.get('host') ?? '';
  if (
    host.includes('bizra.info') &&
    !isApiRequest(req.nextUrl.pathname)
  ) {
    const target = new URL(req.nextUrl.pathname, 'https://bizra.ai');
    target.search = req.nextUrl.search;
    return NextResponse.redirect(target, 301);
  }

  if (!isApiRequest(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const isAuthRoute = req.nextUrl.pathname === '/api/auth/login';
  const limits = isAuthRoute ? AUTH_RATE_LIMIT : API_RATE_LIMIT;
  const rate = consumeRateLimit(getClientKey(req), limits.max, limits.windowMs);

  if (rate.blocked) {
    const blockedResponse = NextResponse.json(
      {
        error: 'Too Many Requests',
        retryAfter: rate.retryAfter,
      },
      { status: 429 }
    );
    attachRateLimitHeaders(blockedResponse, limits.max, rate.remaining, rate.resetAt);
    if (rate.retryAfter) {
      blockedResponse.headers.set('Retry-After', String(rate.retryAfter));
    }
    return blockedResponse;
  }

  if (isPublicRequest(req)) {
    const response = NextResponse.next();
    attachRateLimitHeaders(response, limits.max, rate.remaining, rate.resetAt);
    return response;
  }

  // Health verbose gate: rewrite to non-verbose if unauthenticated.
  // Health probes should always return 200 — never 401.
  if (isVerboseHealthRequest(req)) {
    const verboseToken = getAuthToken(req);
    const verbosePayload = verboseToken ? await verifyAccessToken(verboseToken) : null;
    if (!verbosePayload) {
      const url = req.nextUrl.clone();
      url.searchParams.delete('verbose');
      const response = NextResponse.rewrite(url);
      attachRateLimitHeaders(response, limits.max, rate.remaining, rate.resetAt);
      return response;
    }
  }

  const token = getAuthToken(req);
  if (!token) {
    const response = NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    attachRateLimitHeaders(response, limits.max, rate.remaining, rate.resetAt);
    return response;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    const response = NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    attachRateLimitHeaders(response, limits.max, rate.remaining, rate.resetAt);
    return response;
  }

  if (isMutationMethod(req.method)) {
    const csrfValid = await validateCsrf(req);
    if (!csrfValid) {
      const response = NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 });
      attachRateLimitHeaders(response, limits.max, rate.remaining, rate.resetAt);
      return response;
    }
  }

  const requestHeaders = new Headers(req.headers);
  if (payload.sub) {
    requestHeaders.set('x-bizra-user-id', String(payload.sub));
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  attachRateLimitHeaders(response, limits.max, rate.remaining, rate.resetAt);
  return response;
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals, static assets, and public API routes
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|og-image.png|api/scaffold|api/health|api/ethics).*)',
  ],
};

// Test-only helpers
export const __testing = {
  clearRateLimitStore: () => rateLimitStore.clear(),
  timingSafeEqual,
  isMutationMethod,
};
