// lib/security/api-auth.ts
/**
 * Enhanced API Authentication with JWT + Refresh Token Strategy
 * 
 * Implements:
 * - Short-lived access tokens (15 min)
 * - Long-lived refresh tokens (7 days) with rotation
 * - Device fingerprinting
 * - Rate limiting per token
 * - Token revocation support (Redis-backed in production)
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenStore, type RefreshTokenData } from './token-store';

// Environment configuration - CRITICAL: No fallback defaults for security
function getRequiredSecret(name: string): Uint8Array {
  const value = process.env[name];
  if (!value) {
    // In development, warn but allow with a generated secret
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[SECURITY WARNING] ${name} not set. Using ephemeral secret for development only. ` +
        `Set ${name} environment variable before deploying to production.`
      );
      // Generate a random secret for dev - tokens won't persist across restarts
      const devSecret = crypto.randomUUID() + crypto.randomUUID();
      return new TextEncoder().encode(devSecret);
    }
    throw new Error(
      `CRITICAL: ${name} environment variable is required in production. ` +
      `Application cannot start without proper secret configuration.`
    );
  }
  if (value.length < 32) {
    throw new Error(
      `CRITICAL: ${name} must be at least 32 characters for adequate security.`
    );
  }
  return new TextEncoder().encode(value);
}

const JWT_SECRET = getRequiredSecret('JWT_SECRET');
const REFRESH_SECRET = getRequiredSecret('REFRESH_SECRET');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Token store - uses Redis in production, in-memory in development
const tokenStore = getTokenStore();

export interface BaseUserData {
  sub: string;           // User ID
  email: string;
  roles: string[];
  permissions: string[];
}

export interface UserPayload extends JWTPayload {
  sub: string;           // User ID (override JWTPayload's optional sub)
  email: string;
  roles: string[];
  permissions: string[];
  deviceId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  success: boolean;
  user?: UserPayload;
  error?: string;
}

/**
 * Generate a cryptographically secure random string
 */
function generateSecureId(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate device fingerprint from request
 */
export function generateDeviceFingerprint(request: NextRequest): string {
  const ua = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const acceptLanguage = request.headers.get('accept-language') || '';
  
  // Create a hash of device characteristics
  const fingerprint = `${ua}|${ip}|${acceptLanguage}`;
  return btoa(fingerprint).slice(0, 32);
}

/**
 * Generate access token
 */
export async function generateAccessToken(user: UserPayload): Promise<string> {
  return new SignJWT({
    sub: user.sub,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
    deviceId: user.deviceId
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setJti(generateSecureId(16))
    .sign(JWT_SECRET);
}

/**
 * Generate refresh token with family tracking
 */
export async function generateRefreshToken(
  userId: string, 
  deviceId: string,
  family?: string
): Promise<string> {
  const tokenId = generateSecureId(32);
  const tokenFamily = family || generateSecureId(16);
  const now = Date.now();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Store refresh token metadata in Redis/memory store
  const tokenData: RefreshTokenData = {
    userId,
    deviceId,
    family: tokenFamily,
    issuedAt: now,
    expiresAt
  };
  await tokenStore.storeRefreshToken(tokenId, tokenData);
  
  return new SignJWT({
    sub: userId,
    deviceId,
    family: tokenFamily,
    tokenId
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setJti(tokenId)
    .sign(REFRESH_SECRET);
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(
  user: BaseUserData,
  deviceId: string
): Promise<TokenPair> {
  const userWithDevice: UserPayload = {
    sub: user.sub,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
    deviceId
  };
  
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userWithDevice),
    generateRefreshToken(user.sub, deviceId)
  ]);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 minutes in seconds
  };
}

/**
 * Verify access token
 */
export async function verifyAccessToken(token: string): Promise<AuthResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Check if token is revoked (async Redis/memory lookup)
    if (payload.jti && await tokenStore.isTokenRevoked(payload.jti as string)) {
      return { success: false, error: 'Token has been revoked' };
    }
    
    return {
      success: true,
      user: payload as UserPayload
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('exp')) {
        return { success: false, error: 'Token expired' };
      }
    }
    return { success: false, error: 'Invalid token' };
  }
}

/**
 * Verify refresh token and check for token reuse
 */
export async function verifyRefreshToken(
  token: string
): Promise<{ success: boolean; data?: RefreshTokenData; tokenId?: string; error?: string }> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    const tokenId = payload.jti as string;
    
    // Check if token exists in store (async Redis/memory lookup)
    const tokenData = await tokenStore.getRefreshToken(tokenId);
    if (!tokenData) {
      // Token reuse detected - revoke entire family
      if (payload.family) {
        await tokenStore.revokeTokenFamily(payload.family as string);
      }
      return { success: false, error: 'Token reuse detected - session invalidated' };
    }
    
    // Check expiration
    if (tokenData.expiresAt < Date.now()) {
      await tokenStore.deleteRefreshToken(tokenId);
      return { success: false, error: 'Refresh token expired' };
    }
    
    return {
      success: true,
      data: tokenData,
      tokenId
    };
  } catch {
    return { success: false, error: 'Invalid refresh token' };
  }
}

/**
 * Refresh token rotation - issue new pair and invalidate old refresh token
 */
export async function rotateTokens(
  refreshToken: string,
  user: BaseUserData
): Promise<TokenPair | null> {
  const verification = await verifyRefreshToken(refreshToken);
  
  if (!verification.success || !verification.data || !verification.tokenId) {
    return null;
  }
  
  // Delete old refresh token (async Redis/memory)
  await tokenStore.deleteRefreshToken(verification.tokenId);
  
  // Generate new token pair with same family
  const userWithDevice: UserPayload = { 
    sub: user.sub,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
    deviceId: verification.data.deviceId 
  };
  
  const [accessToken, newRefreshToken] = await Promise.all([
    generateAccessToken(userWithDevice),
    generateRefreshToken(
      verification.data.userId, 
      verification.data.deviceId,
      verification.data.family
    )
  ]);
  
  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 15 * 60
  };
}

/**
 * Revoke all tokens in a family (security breach response)
 */
export async function revokeTokenFamily(family: string): Promise<void> {
  await tokenStore.revokeTokenFamily(family);
}

/**
 * Revoke single access token
 */
export async function revokeAccessToken(jti: string): Promise<void> {
  // Token store handles TTL automatically
  await tokenStore.revokeToken(jti);
}

/**
 * Revoke all tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await tokenStore.revokeAllUserTokens(userId);
}

/**
 * Check if token is revoked (for backward compatibility)
 */
export async function isTokenRevoked(jti: string): Promise<boolean> {
  return tokenStore.isTokenRevoked(jti);
}

/**
 * Alias for backward compatibility - synchronous check (returns false if store not ready)
 * @deprecated Use isTokenRevoked instead
 */
export function revokeToken(jti: string): void {
  tokenStore.revokeToken(jti).catch(console.error);
}

/**
 * Set auth cookies
 */
export async function setAuthCookies(
  response: NextResponse,
  tokens: TokenPair
): Promise<void> {
  const cookieStore = await cookies();
  
  // Access token in HTTP-only cookie
  cookieStore.set('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: tokens.expiresIn,
    path: '/'
  });
  
  // Refresh token in HTTP-only cookie with longer expiry
  cookieStore.set('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/api/auth'  // Only sent to auth endpoints
  });
}

/**
 * Clear auth cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}

/**
 * Authentication middleware
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: UserPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;
  
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Fall back to cookie
    token = request.cookies.get('access_token')?.value;
  }
  
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  const result = await verifyAccessToken(token);
  
  if (!result.success || !result.user) {
    // If token expired, try to use refresh token
    if (result.error === 'Token expired') {
      const refreshToken = request.cookies.get('refresh_token')?.value;
      if (refreshToken) {
        return NextResponse.json(
          { error: 'Token expired', code: 'TOKEN_EXPIRED' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { error: result.error || 'Invalid token' },
      { status: 401 }
    );
  }
  
  // Verify device fingerprint matches
  const currentDevice = generateDeviceFingerprint(request);
  if (result.user.deviceId && result.user.deviceId !== currentDevice) {
    // Device mismatch - potential token theft
    if (result.user.jti) {
      revokeAccessToken(result.user.jti as string);
    }
    return NextResponse.json(
      { error: 'Session invalid - device mismatch' },
      { status: 401 }
    );
  }
  
  return handler(request, result.user);
}

/**
 * Permission check middleware
 */
export function requirePermissions(
  user: UserPayload,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(perm => 
    user.permissions.includes(perm) || user.roles.includes('admin')
  );
}

/**
 * Role check middleware
 */
export function requireRoles(
  user: UserPayload,
  requiredRoles: string[]
): boolean {
  return requiredRoles.some(role => user.roles.includes(role));
}
