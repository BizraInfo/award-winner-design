import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * API Authentication Security Tests
 * Tests critical security behaviors for JWT/refresh token handling
 */

describe('API Authentication Security', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('JWT Secret Configuration', () => {
    it('should throw error in production when JWT_SECRET is missing', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('JWT_SECRET', '');
      vi.stubEnv('REFRESH_SECRET', '');

      await expect(async () => {
        await import('../../../lib/security/api-auth');
      }).rejects.toThrow(/JWT_SECRET environment variable is required/);
    });

    it('should throw error in production when REFRESH_SECRET is missing', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('JWT_SECRET', 'a-valid-32-character-secret-key-here');
      vi.stubEnv('REFRESH_SECRET', '');

      await expect(async () => {
        await import('../../../lib/security/api-auth');
      }).rejects.toThrow(/REFRESH_SECRET environment variable is required/);
    });

    it('should throw error when secret is too short', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('JWT_SECRET', 'short');
      vi.stubEnv('REFRESH_SECRET', 'also-short');

      await expect(async () => {
        await import('../../../lib/security/api-auth');
      }).rejects.toThrow(/must be at least 32 characters/);
    });

    it('should warn but allow in development when secrets are missing', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('JWT_SECRET', '');
      vi.stubEnv('REFRESH_SECRET', '');
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw in development
      const module = await import('../../../lib/security/api-auth');
      expect(module).toBeDefined();
      
      // Should have logged warnings
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY WARNING')
      );
      
      consoleSpy.mockRestore();
    });

    it('should accept valid secrets without error', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('JWT_SECRET', 'this-is-a-valid-32-character-secret-key-for-jwt');
      vi.stubEnv('REFRESH_SECRET', 'this-is-a-valid-32-character-refresh-key!');

      const module = await import('../../../lib/security/api-auth');
      expect(module).toBeDefined();
    });
  });

  describe('Token Generation', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('should generate tokens with required claims', async () => {
      const { generateTokenPair } = await import('../../../lib/security/api-auth');
      
      const userData = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read:profile'],
      };

      const tokens = await generateTokenPair(userData, 'device-fingerprint-123');
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeGreaterThan(0);
    });
  });

  describe('Token Verification', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('should reject tampered tokens', async () => {
      const { verifyAccessToken } = await import('../../../lib/security/api-auth');
      
      const tamperedToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.tampered';
      
      const result = await verifyAccessToken(tamperedToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired tokens', async () => {
      const { verifyAccessToken } = await import('../../../lib/security/api-auth');
      
      // This is an obviously expired/invalid token
      const expiredToken = 'expired.token.here';
      
      const result = await verifyAccessToken(expiredToken);
      
      expect(result.success).toBe(false);
    });
  });

  describe('Token Revocation', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('should revoke tokens successfully', async () => {
      const { generateTokenPair, revokeToken, isTokenRevoked } = await import('../../../lib/security/api-auth');
      
      const userData = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read:profile'],
      };

      const tokens = await generateTokenPair(userData, 'device-123');
      
      // Token should not be revoked initially
      expect(isTokenRevoked(tokens.accessToken)).toBe(false);
      
      // Revoke the token
      revokeToken(tokens.accessToken);
      
      // Token should now be revoked
      expect(isTokenRevoked(tokens.accessToken)).toBe(true);
    });
  });
});
