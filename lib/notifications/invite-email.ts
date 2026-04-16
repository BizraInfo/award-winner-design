// lib/notifications/invite-email.ts
/**
 * Invite email notification — stubbed for v1.
 * In production, swap for SendGrid / Resend / SES.
 */

export interface InviteEmailParams {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<void> {
  // Stub: log to console in dev, integrate with email provider in prod
  if (process.env.NODE_ENV === 'development') {
    console.log('[InviteEmail] Would send:', {
      to: params.to,
      subject: `${params.inviterName} invited you to ${params.workspaceName}`,
      acceptUrl: params.acceptUrl,
      role: params.role,
      expires: params.expiresAt.toISOString(),
    });
    return;
  }

  // Production: integrate with email provider
  // e.g. await resend.emails.send({ ... })
  console.warn('[InviteEmail] No email provider configured. Invite not sent to:', params.to);
}
