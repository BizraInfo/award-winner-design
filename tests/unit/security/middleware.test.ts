import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { __testing, middleware } from '../../../middleware';

describe('API middleware security enforcement', () => {
  const accessToken = 'dev-access-token';

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('JWT_SECRET', '');
    __testing.clearRateLimitStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    __testing.clearRateLimitStore();
  });

  it('allows non-verbose health checks without authentication', async () => {
    const req = new NextRequest('http://localhost:3000/api/health');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('requires authentication for verbose health at the middleware boundary', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/health?verbose=true'
    );
    const res = await middleware(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'Authentication required',
    });
  });

  it('blocks protected API requests without access token', async () => {
    const req = new NextRequest('http://localhost:3000/api/metrics');
    const res = await middleware(req);

    expect(res.status).toBe(401);
  });

  it('protects logout even though login and refresh are public entrypoints', async () => {
    const req = new NextRequest('https://bizra.ai/api/auth/login', {
      method: 'DELETE',
    });
    const res = await middleware(req);

    expect(res.status).toBe(401);
  });

  it.each([
    '/api/ethics',
    '/api/scaffold/evidence',
    '/api/scaffold/health',
    '/api/scaffold/metrics',
  ])('requires authentication for public claim-bearing API %s', async (pathname) => {
    const req = new NextRequest(`https://bizra.ai${pathname}`);
    const res = await middleware(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Authentication required' });
  });

  it.each(['/api/genesis', '/api/node/activate'])(
    'enforces beta admission before public mutation routing for %s',
    async (pathname) => {
      vi.stubEnv('BIZRA_ACCESS_MODE', 'invite_only');
      vi.stubEnv('BIZRA_BETA_ADMIT_SECRET', 'test-admit-secret-with-enough-entropy');

      const req = new NextRequest(`https://bizra.ai${pathname}`, {
        method: 'POST',
      });
      const res = await middleware(req);

      expect(res.status).toBe(403);
      await expect(res.json()).resolves.toMatchObject({
        code: 'BETA_INVITE_REQUIRED',
        admitted: false,
      });
    }
  );

  it.each(['/api/genesis', '/api/node/activate'])(
    'requires authentication for activation APIs even when beta access is public: %s',
    async (pathname) => {
      vi.stubEnv('BIZRA_ACCESS_MODE', 'public');

      const req = new NextRequest(`https://bizra.ai${pathname}`, {
        method: 'POST',
      });
      const res = await middleware(req);

      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: 'Authentication required' });
    }
  );

  it('allows protected GET request with valid bearer token', async () => {
    const req = new NextRequest('http://localhost:3000/api/metrics', {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('requires CSRF token on protected mutation requests', async () => {
    const req = new NextRequest('http://localhost:3000/api/metrics', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const res = await middleware(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/csrf/i);
  });

  it('allows protected mutation when CSRF header and cookie match', async () => {
    const csrfValue = 'csrf-token-123';
    const req = new NextRequest('http://localhost:3000/api/metrics', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-csrf-token': csrfValue,
        cookie: `__Host-bizra-csrf=${csrfValue}; access_token=${accessToken}`,
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('rate-limits /api/auth/login after 5 requests per window', async () => {
    const requests: NextRequest[] = Array.from({ length: 6 }).map(
      () => new NextRequest('http://localhost:3000/api/auth/login', { method: 'POST' })
    );

    let lastStatus = 200;
    for (const req of requests) {
      const res = await middleware(req);
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});

describe('public claim containment', () => {
  it.each([
    '/atlas',
    '/book',
    '/dema',
    '/docs',
    '/films/index.html',
    '/genesis',
    '/info',
    '/install/index.html',
    '/lab',
    '/login',
    '/manifest',
    '/research',
    '/showcase',
    '/terminal',
    '/wallet',
  ])('contains unaudited public surface %s at the reviewed root', async (pathname) => {
    const req = new NextRequest(`https://bizra.ai${pathname}`);
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'https://bizra.ai/?containment=public-claim-review'
    );
    expect(res.headers.get('x-bizra-public-claim-boundary')).toBe('contained');
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('allows the reviewed public root', async () => {
    const req = new NextRequest('https://bizra.ai/');
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-bizra-public-claim-boundary')).toBe('reviewed');
  });

  it('allows non-document assets without exposing legacy HTML', async () => {
    const req = new NextRequest('https://bizra.ai/apple-icon.png');
    const res = await middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-bizra-public-claim-boundary')).toBe('asset');
  });
});
