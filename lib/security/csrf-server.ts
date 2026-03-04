// lib/security/csrf-server.ts
/**
 * Server-side CSRF utilities.
 */

import crypto from 'crypto';
import { DEFAULT_CSRF_CONFIG } from './csrf-config';

/**
 * Generate cryptographically secure CSRF token.
 */
export function generateCSRFToken(): string {
  return crypto
    .randomBytes(DEFAULT_CSRF_CONFIG.tokenLength)
    .toString('base64')
    .replace(/=/g, '');
}

/**
 * Hash token for secure storage comparison.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify CSRF token using timing-safe comparison.
 */
export function verifyCSRFToken(
  providedToken: string,
  storedTokenHash: string
): boolean {
  const providedHash = hashToken(providedToken);

  if (providedHash.length !== storedTokenHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(providedHash),
    Buffer.from(storedTokenHash)
  );
}

