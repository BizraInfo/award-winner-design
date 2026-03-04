// app/api/csrf-token/route.ts
/**
 * CSRF Token API Endpoint
 * Generates and returns CSRF tokens for client-side protection
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, hashToken, DEFAULT_CSRF_CONFIG } from '@/lib/security/csrf-protection';

export async function GET(request: NextRequest) {
  // Generate new CSRF token
  const token = generateCSRFToken();
  const tokenHash = hashToken(token);
  
  // Create response with token
  const response = NextResponse.json({ 
    token,
    expires: Date.now() + (DEFAULT_CSRF_CONFIG.cookieOptions.maxAge * 1000)
  });
  
  // Set secure cookie with token hash for server-side verification
  response.cookies.set(
    DEFAULT_CSRF_CONFIG.cookieName,
    token,
    {
      httpOnly: DEFAULT_CSRF_CONFIG.cookieOptions.httpOnly,
      secure: DEFAULT_CSRF_CONFIG.cookieOptions.secure,
      sameSite: DEFAULT_CSRF_CONFIG.cookieOptions.sameSite,
      path: DEFAULT_CSRF_CONFIG.cookieOptions.path,
      maxAge: DEFAULT_CSRF_CONFIG.cookieOptions.maxAge
    }
  );
  
  // Store hash in server-side session or separate cookie for verification
  response.cookies.set(
    `${DEFAULT_CSRF_CONFIG.cookieName}_hash`,
    tokenHash,
    {
      httpOnly: true,
      secure: DEFAULT_CSRF_CONFIG.cookieOptions.secure,
      sameSite: DEFAULT_CSRF_CONFIG.cookieOptions.sameSite,
      path: DEFAULT_CSRF_CONFIG.cookieOptions.path,
      maxAge: DEFAULT_CSRF_CONFIG.cookieOptions.maxAge
    }
  );
  
  return response;
}

export async function POST(request: NextRequest) {
  // Validate CSRF token for state-changing operations
  const csrfHeader = request.headers.get(DEFAULT_CSRF_CONFIG.headerName);
  const csrfCookie = request.cookies.get(DEFAULT_CSRF_CONFIG.cookieName)?.value;
  const csrfHashCookie = request.cookies.get(`${DEFAULT_CSRF_CONFIG.cookieName}_hash`)?.value;
  
  if (!csrfHeader || !csrfCookie || !csrfHashCookie) {
    return NextResponse.json(
      { error: 'CSRF token missing' },
      { status: 403 }
    );
  }
  
  // Verify tokens match using timing-safe comparison
  const providedHash = hashToken(csrfHeader);
  
  // Use timing-safe comparison to prevent timing attacks
  const hashesMatch = providedHash.length === csrfHashCookie.length &&
    crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(csrfHashCookie));
  const tokensMatch = csrfHeader.length === csrfCookie.length &&
    crypto.timingSafeEqual(Buffer.from(csrfHeader), Buffer.from(csrfCookie));
  
  if (!hashesMatch || !tokensMatch) {
    return NextResponse.json(
      { error: 'CSRF token invalid' },
      { status: 403 }
    );
  }
  
  return NextResponse.json({ valid: true });
}
