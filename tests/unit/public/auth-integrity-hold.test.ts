import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { POST, PUT } from '../../../app/api/auth/login/route';

describe('authentication integrity hold', () => {
  it.each([
    ['login', POST],
    ['refresh', PUT],
  ] as const)('fails %s closed without issuing or rotating a token', async (_name, handler) => {
    const request = new NextRequest('https://bizra.ai/api/auth/login', {
      method: handler === POST ? 'POST' : 'PUT',
      body: handler === POST ? JSON.stringify({ email: 'x', password: 'x' }) : undefined,
      headers: handler === POST ? { 'content-type': 'application/json' } : undefined,
    });

    const response = await handler(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: 'AUTH_INTEGRITY_HOLD',
      error: 'Authentication is unavailable during the public integrity review',
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('contains no source-embedded demo user or password registry', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/api/auth/login/route.ts'),
      'utf8'
    );

    expect(source).not.toMatch(/DEMO_USERS|Mock user database lookup/i);
    expect(source).not.toMatch(/password\s*:\s*['"][^'"]+['"]/);
  });

  it.each([
    'app/login/page.tsx',
    'scripts/verify-canary-rollback-drill.sh',
  ])('contains no known demo credential markers in %s', (sourcePath) => {
    const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8');

    expect(source).not.toMatch(/demo@bizra\.ai|demo123|demo credentials/i);
  });

  it('requires canary credentials and streams login JSON through stdin', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'scripts/verify-canary-rollback-drill.sh'),
      'utf8'
    );

    expect(source).toMatch(/\$\{CANARY_AUTH_EMAIL:\?[^}]+\}/);
    expect(source).toMatch(/\$\{CANARY_AUTH_PASSWORD:\?[^}]+\}/);
    expect(source).toContain(
      '{email: env.CANARY_AUTH_EMAIL, password: env.CANARY_AUTH_PASSWORD}'
    );
    expect(source).toContain('--data-binary @-');
  });
});
