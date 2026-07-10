// lib/security/csrf-client.tsx
/**
 * Client-side CSRF helpers.
 */

import * as React from 'react';
import { DEFAULT_CSRF_CONFIG } from './csrf-config';

function getCSRFTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const name = `${DEFAULT_CSRF_CONFIG.cookieName}=`;
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');

  for (let i = 0; i < cookies.length; i += 1) {
    let c = cookies[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

async function ensureCSRFToken(): Promise<string | null> {
  const existing = getCSRFTokenFromCookie();
  if (existing) return existing;

  const response = await fetch('/api/csrf-token', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }

  const body = (await response.json().catch(() => null)) as { token?: string } | null;
  return getCSRFTokenFromCookie() ?? body?.token ?? null;
}

/**
 * CSRF token hook for client components.
 */
export function useCSRFToken() {
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    ensureCSRFToken().then(setToken).catch(() => setToken(null));
  }, []);

  return token;
}

/**
 * CSRF-protected fetch wrapper.
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || 'GET';
  const csrfToken = ['GET', 'HEAD', 'OPTIONS'].includes(method)
    ? getCSRFTokenFromCookie()
    : await ensureCSRFToken();

  const headers = new Headers(options.headers);
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set(DEFAULT_CSRF_CONFIG.headerName, csrfToken);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}
