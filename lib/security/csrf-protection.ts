// lib/security/csrf-protection.ts
/**
 * Backward-compatible server exports.
 *
 * Client helpers moved to `csrf-client.tsx` to avoid mixing server/runtime
 * crypto with React hooks in a single module.
 */

export { DEFAULT_CSRF_CONFIG } from './csrf-config';
export { generateCSRFToken, hashToken, verifyCSRFToken } from './csrf-server';
