// lib/security/csrf-protection.ts
/**
 * Unified CSRF module facade.
 *
 * Re-exports all CSRF utilities from their split modules:
 * - `csrf-config.ts`  — Runtime-agnostic configuration (Edge + Node + Browser)
 * - `csrf-server.ts`  — Server-side crypto (Node.js only)
 * - `csrf-client.tsx` — React hooks + fetch wrapper (Browser only)
 */

export { DEFAULT_CSRF_CONFIG, type CSRFConfig } from './csrf-config';
export { generateCSRFToken, hashToken, verifyCSRFToken } from './csrf-server';
export { useCSRFToken, csrfFetch } from './csrf-client';
