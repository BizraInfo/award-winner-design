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

  it('blocks protected API requests without access token', async () => {
    const req = new NextRequest('http://localhost:3000/api/metrics');
    const res = await middleware(req);

    expect(res.status).toBe(401);
  });

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
    const req = new NextRequest('http://localhost:3000/api/ethics', {
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
    const req = new NextRequest('http://localhost:3000/api/ethics', {
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
