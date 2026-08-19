import type { BizraAccessMode } from './access-mode';
import {
  PUBLIC_BOUNDARY,
  PUBLIC_CLAIM_AUDIT_URL,
} from '../public-claims/boundary';

type PublicBetaStatusInput = {
  admitted: boolean;
  measuredAt: string;
  mode: BizraAccessMode;
};

export function buildPublicBetaStatus({
  admitted,
  measuredAt,
  mode,
}: PublicBetaStatusInput) {
  return {
    admitted,
    access: mode === 'invite_only' ? 'invitation_required' : 'public',
    claim_id: 'BIZRA-PUBLIC-005',
    evidence_commit: PUBLIC_BOUNDARY.evidenceCommit,
    evidence_href: PUBLIC_CLAIM_AUDIT_URL,
    measured_at: measuredAt,
    scope: 'web_access_gate_only',
    truth_label: 'MEASURED',
  } as const;
}
