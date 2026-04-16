import { NextRequest, NextResponse } from 'next/server';
import {
  generateTokenPair,
  rotateTokens,
  verifyRefreshToken,
  clearAuthCookies,
  setAuthCookies,
  revokeAllUserTokens,
  generateDeviceFingerprint,
  withAuth,
  BaseUserData
} from '@/lib/security/api-auth';

// Mock user database lookup (replace with actual DB query)
async function validateCredentials(
  email: string,
  password: string
): Promise<BaseUserData | null> {
  // In production, this would query your database and verify password hash
  // Example using bcrypt: await bcrypt.compare(password, user.passwordHash)
  
  const DEMO_USERS: Record<string, { password: string; data: BaseUserData }> = {
    'demo@bizra.ai': {
      password: 'demo123',
      data: { sub: 'user_123', email: 'demo@bizra.ai', roles: ['user'], permissions: ['read:profile', 'write:profile'] },
    },
    'investor@bizra.ai': {
      password: 'bizra2026',
      data: { sub: 'user_investor', email: 'investor@bizra.ai', roles: ['user'], permissions: ['read:profile'] },
    },
  };

  const entry = DEMO_USERS[email];
  if (entry && password === entry.password) return entry.data;
  return null;
}

// Mock user lookup by ID (replace with actual DB query)
async function getUserById(userId: string): Promise<BaseUserData | null> {
  const byId: Record<string, BaseUserData> = {
    user_123: { sub: 'user_123', email: 'demo@bizra.ai', roles: ['user'], permissions: ['read:profile', 'write:profile'] },
    user_investor: { sub: 'user_investor', email: 'investor@bizra.ai', roles: ['user'], permissions: ['read:profile'] },
  };
  return byId[userId] ?? null;
}

/**
 * POST /api/auth/login
 * Authenticate user and issue tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    // Validate credentials
    const user = await validateCredentials(email, password);
    
    if (!user) {
      // Use generic error to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Generate device fingerprint
    const deviceId = generateDeviceFingerprint(request);
    
    // Generate token pair
    const tokens = await generateTokenPair(user, deviceId);
    
    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.sub,
        email: user.email,
        roles: user.roles
      },
      expiresIn: tokens.expiresIn
    });
    
    // Set auth cookies
    await setAuthCookies(response, tokens);
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/login
 * Refresh tokens using refresh token
 */
export async function PUT(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 401 }
      );
    }
    
    // Verify refresh token
    const verification = await verifyRefreshToken(refreshToken);
    
    if (!verification.success || !verification.data) {
      await clearAuthCookies();
      return NextResponse.json(
        { error: verification.error || 'Invalid refresh token' },
        { status: 401 }
      );
    }
    
    // Get fresh user data
    const user = await getUserById(verification.data.userId);
    
    if (!user) {
      await clearAuthCookies();
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }
    
    // Rotate tokens
    const tokens = await rotateTokens(refreshToken, user);
    
    if (!tokens) {
      await clearAuthCookies();
      return NextResponse.json(
        { error: 'Token rotation failed' },
        { status: 401 }
      );
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      expiresIn: tokens.expiresIn
    });
    
    // Set new auth cookies
    await setAuthCookies(response, tokens);
    
    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/login
 * Logout - revoke tokens and clear cookies
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (_req, user) => {
    try {
      // Revoke all user tokens
      if (user.sub) {
        revokeAllUserTokens(user.sub);
      }
      
      // Clear auth cookies
      await clearAuthCookies();
      
      return NextResponse.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { error: 'Logout failed' },
        { status: 500 }
      );
    }
  });
}
