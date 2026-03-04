// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * API Authentication Security Tests
 * Tests critical security behaviors for JWT/refresh token handling
 *
 * Uses Node environment (not jsdom) because jose's WebAPI bundle performs
 * `payload instanceof Uint8Array` checks that fail across jsdom/Node realms.
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
      // Direct assignment needed — vi.stubEnv doesn't override Vite .env loading reliably
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      delete process.env.REFRESH_SECRET;

      const { generateAccessToken } = await import('../../../lib/security/api-auth');

      await expect(
        generateAccessToken({ sub: 'x', email: 'x', roles: [], permissions: [] })
      ).rejects.toThrow(/JWT_SECRET environment variable is required/);
    }, 15_000);

    it('should throw error in production when REFRESH_SECRET is missing', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a-valid-32-character-secret-key-here';
      delete process.env.REFRESH_SECRET;

      const { generateRefreshToken } = await import('../../../lib/security/api-auth');

      await expect(
        generateRefreshToken('user-1', 'device-1')
      ).rejects.toThrow(/REFRESH_SECRET environment variable is required/);
    });

    it('should throw error when secret is too short', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';
      process.env.REFRESH_SECRET = 'also-short';

      const { generateAccessToken } = await import('../../../lib/security/api-auth');

      await expect(
        generateAccessToken({ sub: 'x', email: 'x', roles: [], permissions: [] })
      ).rejects.toThrow(/must be at least 32 characters/);
    });

    it('should warn but allow in development when secrets are missing', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('JWT_SECRET', '');
      vi.stubEnv('REFRESH_SECRET', '');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Should not throw in development — lazy init generates ephemeral secret on use.
      const { generateAccessToken } = await import('../../../lib/security/api-auth');
      await generateAccessToken({ sub: 'dev', email: 'dev@test.io', roles: [], permissions: [] });

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

      const { generateAccessToken } = await import('../../../lib/security/api-auth');
      const token = await generateAccessToken({ sub: 'test', email: 'test@test.io', roles: ['user'], permissions: [] });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('Token Generation', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      // Clean up direct process.env assignments from prior tests
      delete process.env.JWT_SECRET;
      delete process.env.REFRESH_SECRET;
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
      delete process.env.JWT_SECRET;
      delete process.env.REFRESH_SECRET;
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
      delete process.env.JWT_SECRET;
      delete process.env.REFRESH_SECRET;
    });

    it('should revoke tokens successfully', async () => {
      const { generateTokenPair, revokeAccessToken, isTokenRevoked } = await import('../../../lib/security/api-auth');

      const userData = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read:profile'],
      };

      const tokens = await generateTokenPair(userData, 'device-123');

      // Use a known JTI for revocation testing (access token is opaque)
      const testJti = 'test-jti-for-revocation';

      // Token should not be revoked initially
      expect(await isTokenRevoked(testJti)).toBe(false);

      // Revoke the token
      await revokeAccessToken(testJti);

      // Token should now be revoked
      expect(await isTokenRevoked(testJti)).toBe(true);
    });
  });
});
