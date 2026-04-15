// lib/invites/tokens.ts
/**
 * Invite token generation and hashing.
 * Tokens are URL-safe, 32-byte random values.
 * Only the SHA-256 hash is stored; the raw token is sent once via email.
 */

import { randomBytes, createHash } from 'crypto';

const TOKEN_BYTES = 32;

export function generateInviteToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
