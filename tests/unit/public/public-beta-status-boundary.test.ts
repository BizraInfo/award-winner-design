import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST as verifyInvite } from '../../../app/api/beta/verify-invite/route';
import { buildPublicBetaStatus } from '../../../lib/beta/public-status';

describe('public beta-status boundary', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns only a canonical, request-scoped access measurement', () => {
    expect(
      buildPublicBetaStatus({
        admitted: false,
        measuredAt: '2026-07-24T00:00:00.000Z',
        mode: 'invite_only',
      })
    ).toEqual({
      admitted: false,
      access: 'invitation_required',
      claim_id: 'BIZRA-PUBLIC-005',
      evidence_commit: '26bb57359186a3ab533dd51e3623e0c84d5078e9',
      evidence_href:
        'https://github.com/BizraInfo/Dema/blob/26bb57359186a3ab533dd51e3623e0c84d5078e9/docs/audits/BIZRA_AI_PUBLIC_CLAIM_CONTAINMENT_1A.md',
      measured_at: '2026-07-24T00:00:00.000Z',
      scope: 'web_access_gate_only',
      truth_label: 'MEASURED',
    });
  });

  it('keeps substrate, invite configuration, and noncanonical labels private', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/api/beta/status/route.ts'),
      'utf8'
    );

    expect(source).not.toMatch(
      /getRedisHealthStatus|invite_codes_configured|closed_loop|PREVIEW_DIAGNOSTIC_ONLY/
    );
  });

  it('uses the same canonical access measurement after public admission', async () => {
    vi.stubEnv('BIZRA_ACCESS_MODE', 'public');

    const response = await verifyInvite(
      new NextRequest('https://bizra.ai/api/beta/verify-invite', {
        method: 'POST',
        body: JSON.stringify({ code: '' }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(
      [
        'access',
        'admitted',
        'claim_id',
        'evidence_commit',
        'evidence_href',
        'measured_at',
        'scope',
        'truth_label',
      ].sort()
    );
    expect(body).toMatchObject({
      admitted: true,
      access: 'public',
      claim_id: 'BIZRA-PUBLIC-005',
      evidence_commit: '26bb57359186a3ab533dd51e3623e0c84d5078e9',
      scope: 'web_access_gate_only',
      truth_label: 'MEASURED',
    });
    expect(body.measured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
