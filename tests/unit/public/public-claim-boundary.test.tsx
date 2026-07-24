import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Page from '../../../app/page';
import {
  PUBLIC_BOUNDARY,
  PUBLIC_EVIDENCE_LINKS,
  PUBLIC_TRUTH_ROWS,
} from '../../../lib/public-claims/boundary';

describe('public claim boundary', () => {
  it('publishes an exact dated evidence boundary', () => {
    expect(PUBLIC_BOUNDARY.reviewedOnIso).toBe('2026-07-24');
    expect(PUBLIC_BOUNDARY.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(PUBLIC_BOUNDARY.evidenceCommit).toBe(
      '26bb57359186a3ab533dd51e3623e0c84d5078e9'
    );
    expect(PUBLIC_BOUNDARY.evidenceRefreshedOnIso).toBe('2026-07-24');
    expect(PUBLIC_EVIDENCE_LINKS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Claim Register',
          href: expect.stringContaining(
            '/blob/26bb57359186a3ab533dd51e3623e0c84d5078e9/docs/CLAIM_REGISTER_v0_1.md'
          ),
        }),
        expect.objectContaining({
          label: 'Current Limits',
          href: expect.stringContaining(
            '/blob/26bb57359186a3ab533dd51e3623e0c84d5078e9/docs/CURRENT_LIMITS.md'
          ),
        }),
      ])
    );
  });

  it('keeps every public status statement inside the canonical truth labels', () => {
    expect(PUBLIC_TRUTH_ROWS.map(({ label }) => label)).toEqual([
      'VERIFIED',
      'DESIGNED_NOT_LIVE',
      'UNKNOWN',
    ]);
    expect(new Set(PUBLIC_TRUTH_ROWS.map(({ claimId }) => claimId)).size).toBe(
      PUBLIC_TRUTH_ROWS.length
    );
    expect(
      PUBLIC_TRUTH_ROWS.every(
        ({ claimId, evidenceHref }) =>
          /^BIZRA-PUBLIC-\d{3}$/.test(claimId) &&
          evidenceHref.includes(
            '/blob/26bb57359186a3ab533dd51e3623e0c84d5078e9/docs/'
          )
      )
    ).toBe(true);

    const publishedText = PUBLIC_TRUTH_ROWS.map(({ statement }) => statement).join(' ');
    expect(publishedText).toMatch(/local-first product face/i);
    expect(publishedText).toMatch(/federation.*not live/i);
    expect(publishedText).toMatch(/signer rotation remains pending/i);
    expect(publishedText).not.toMatch(
      /live receipt chain|live network data|machine-enforced|zero vulnerabilities|agents per node/i
    );
  });

  it('renders the truth labels, current limitations, and evidence links', () => {
    const { container } = render(<Page />);

    expect(
      screen.getByRole('heading', { level: 1, name: /trust begins where the claim stops/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/reviewed 24 july 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/evidence baseline 24 july 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/audited source base 568ab0b41c32/i)).toBeInTheDocument();

    const truthList = screen.getByRole('list', { name: /current public truth/i });
    for (const row of PUBLIC_TRUTH_ROWS) {
      expect(within(truthList).getByText(row.label)).toBeInTheDocument();
      expect(within(truthList).getByText(row.claimId)).toBeInTheDocument();
      expect(within(truthList).getByText(row.statement)).toBeInTheDocument();
      expect(
        within(truthList).getByRole('link', {
          name: new RegExp(`evidence for ${row.claimId}`, 'i'),
        })
      ).toHaveAttribute('href', row.evidenceHref);
    }

    for (const link of PUBLIC_EVIDENCE_LINKS) {
      expect(
        screen.getByRole('link', { name: new RegExp(link.label, 'i') })
      ).toHaveAttribute('href', link.href);
    }

    const renderedText = container.textContent ?? '';
    expect(renderedText).not.toMatch(
      /live receipt chain|live network data|machine-enforced|formally verified|fully autonomous|guaranteed rewards|production federation|URP is live|UKE is live|PoI pays|token price|token value|zero vulnerabilities|agents per node/i
    );
    expect(renderedText).not.toMatch(
      /\b\d[\d,]*(?:\+)?\s+(?:tests|agents|proofs|vectors|commits|vulnerabilities)\b/i
    );
    expect(renderedText).not.toMatch(/new signed public receipt/i);
  });

  it('keeps legacy runtime and error telemetry outside the reviewed layout', () => {
    const layoutSource = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8');

    expect(layoutSource).not.toMatch(/GlobalErrorBoundary|PerformanceObserver/);
    expect(layoutSource).not.toMatch(/BIZRA Kernel|self-correction contained/i);
  });
});
