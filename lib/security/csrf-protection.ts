// lib/security/csrf-protection.ts
/**
 * CSRF Protection Middleware - P0 Critical Implementation
 * Aligned with Ihsān (Amānah/Trust) principles
 */

import crypto from 'crypto';

export interface CSRFConfig {
  tokenLength: number;
  cookieName: string;
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
  headerName: 'X-CSRF-Token',
  cookieOptions: {
    // IMPORTANT: httpOnly must be FALSE for double-submit cookie pattern
    // Client JS needs to read the cookie to send it in the header
    httpOnly: false,
    secure: true, // __Host- requires Secure
    sameSite: 'strict',
    path: '/',
    maxAge: 3600 // 1 hour
  }
};

/**
 * Generate cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  // Use Web Crypto API in browser, crypto in Node
  if (typeof window !== 'undefined') {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64').replace(/=/g, '');
  }
  return crypto.randomBytes(32).toString('base64').replace(/=/g, '');
}

/**
 * Hash token for secure storage comparison
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify CSRF token using timing-safe comparison
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

/**
 * CSRF Protection Hook for React/Next.js
 */
export function useCSRFToken() {
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    setToken(getCSRFTokenFromCookie());
  }, []);

  return token;
}

/**
 * CSRF-protected fetch wrapper
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const csrfToken = getCSRFTokenFromCookie();

  const headers = new Headers(options.headers);
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(options.method || 'GET')) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
}

function getCSRFTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const name = DEFAULT_CSRF_CONFIG.cookieName + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

// Import for useCSRFToken hook
import * as React from 'react';
