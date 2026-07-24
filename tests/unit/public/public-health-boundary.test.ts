import { describe, expect, it } from 'vitest';

import { GET } from '../../../app/api/health/route';

describe('public health boundary', () => {
  it('returns one scoped measurement without deployment or substrate details', async () => {
    const response = await GET(new Request('https://bizra.ai/api/health'));
    const body = await response.json();

    expect(response.status).toBeLessThan(600);
    expect(Object.keys(body).sort()).toEqual([
      'claim_id',
      'evidence_commit',
      'evidence_href',
      'measured_at',
      'scope',
      'status',
      'truth_label',
    ]);
    expect(body).toMatchObject({
      claim_id: 'BIZRA-PUBLIC-004',
      evidence_commit: '26bb57359186a3ab533dd51e3623e0c84d5078e9',
      evidence_href:
        'https://github.com/BizraInfo/Dema/blob/26bb57359186a3ab533dd51e3623e0c84d5078e9/docs/audits/BIZRA_AI_PUBLIC_CLAIM_CONTAINMENT_1A.md',
      scope: 'web_process_health_only',
      truth_label: 'MEASURED',
    });
    expect(body.measured_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(body).not.toHaveProperty('buildId');
    expect(body).not.toHaveProperty('environment');
    expect(body).not.toHaveProperty('redis');
    expect(body).not.toHaveProperty('uptime');
  });
});
