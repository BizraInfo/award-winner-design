// lib/security/csrf-config.ts
/**
 * Shared CSRF configuration (runtime-agnostic).
 * Keep this file free of Node-only imports so it can be reused
 * by both server and client utilities.
 */

export interface CSRFConfig {
  tokenLength: number;
  cookieName: string;
  hashCookieName: string;
  headerName: string;
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    maxAge: number;
  };
}

export const DEFAULT_CSRF_CONFIG: CSRFConfig = {
  tokenLength: 32,
  cookieName: '__Host-bizra-csrf',
  hashCookieName: '__Host-bizra-csrf_hash',
  headerName: 'X-CSRF-Token',
  cookieOptions: {
    // IMPORTANT: httpOnly must be FALSE for double-submit cookie pattern
    // Client JS needs to read the cookie to send it in the header.
    httpOnly: false,
    secure: true, // __Host- requires Secure
    sameSite: 'strict',
    path: '/',
    maxAge: 3600, // 1 hour
  },
};
