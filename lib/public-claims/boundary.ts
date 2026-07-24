export const PUBLIC_BOUNDARY = {
  reviewedOnIso: '2026-07-24',
  reviewedOnDisplay: '24 July 2026',
  evidenceRefreshedOnIso: '2026-07-24',
  evidenceRefreshedOnDisplay: '24 July 2026',
  evidenceCommit: '26bb57359186a3ab533dd51e3623e0c84d5078e9',
  sourceCommit: '568ab0b41c32f812b8ce4d20e7f4ffdf1ebffd6e',
} as const;

const CLAIM_REGISTER_URL =
  'https://github.com/BizraInfo/Dema/blob/26bb57359186a3ab533dd51e3623e0c84d5078e9/docs/CLAIM_REGISTER_v0_1.md';
const CURRENT_LIMITS_URL =
  'https://github.com/BizraInfo/Dema/blob/26bb57359186a3ab533dd51e3623e0c84d5078e9/docs/CURRENT_LIMITS.md';

export const PUBLIC_CLAIM_AUDIT_URL =
  'https://github.com/BizraInfo/Dema/blob/26bb57359186a3ab533dd51e3623e0c84d5078e9/docs/audits/BIZRA_AI_PUBLIC_CLAIM_CONTAINMENT_1A.md';

export const PUBLIC_EVIDENCE_LINKS = [
  {
    label: 'Claim Register',
    description: 'Canonical public-claim labels and evidence requirements.',
    href: CLAIM_REGISTER_URL,
  },
  {
    label: 'Current Limits',
    description: 'Current measured, local-only, and not-live boundaries.',
    href: CURRENT_LIMITS_URL,
  },
] as const;

export const PUBLIC_TRUTH_ROWS = [
  {
    claimId: 'BIZRA-PUBLIC-001',
    label: 'VERIFIED',
    statement:
      'Dema is a local-first product face: it reads local state, explains it, and previews safe next steps.',
    evidenceHref: CURRENT_LIMITS_URL,
  },
  {
    claimId: 'BIZRA-PUBLIC-002',
    label: 'DESIGNED_NOT_LIVE',
    statement:
      'Federation, cross-node synchronization, shared URP runtime, token economics, and Proof-of-Impact rewards are not live.',
    evidenceHref: CURRENT_LIMITS_URL,
  },
  {
    claimId: 'BIZRA-PUBLIC-003',
    label: 'UNKNOWN',
    statement:
      'The currently trusted public signing identity is not asserted here while signer rotation remains pending.',
    evidenceHref: CURRENT_LIMITS_URL,
  },
] as const;

const REVIEWED_PUBLIC_PATHS = new Set(['/']);
const REVIEWED_PUBLIC_ASSETS = new Set([
  '/apple-icon.png',
  '/icon-dark-32x32.png',
  '/icon-light-32x32.png',
]);

export type PublicPathDisposition = 'reviewed' | 'asset' | 'contained';

export function classifyPublicPath(pathname: string): PublicPathDisposition {
  if (REVIEWED_PUBLIC_PATHS.has(pathname)) return 'reviewed';
  if (REVIEWED_PUBLIC_ASSETS.has(pathname)) return 'asset';
  return 'contained';
}
