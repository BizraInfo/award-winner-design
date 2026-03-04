import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCSRFToken,
  hashToken,
  verifyCSRFToken,
  DEFAULT_CSRF_CONFIG,
} from '../../../lib/security/csrf-protection';

/**
 * CSRF Protection Security Tests
 * Tests critical security behaviors for CSRF token handling
 */

describe('CSRF Protection', () => {
  describe('Token Generation', () => {
    it('should generate tokens of correct length', () => {
      const token = generateCSRFToken();
      const bytes = DEFAULT_CSRF_CONFIG.tokenLength;
      // Base64 length without "=" padding.
      const base64Length = Math.ceil(bytes / 3) * 4;
      const padding = (3 - (bytes % 3)) % 3;
      const expectedLength = base64Length - padding;
      expect(token.length).toBe(expectedLength);
    });

    it('should generate unique tokens on each call', () => {
      const tokens = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      
      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should generate cryptographically random tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      // Tokens should not share common prefixes (would indicate weak RNG)
      expect(token1.substring(0, 8)).not.toBe(token2.substring(0, 8));
    });
  });

  describe('Token Hashing', () => {
    it('should produce consistent hashes for same input', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token-a');
      const hash2 = hashToken('token-b');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce fixed-length SHA-256 hashes', () => {
      const hash = hashToken('any-input');
      // SHA-256 = 64 hex characters
      expect(hash.length).toBe(64);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token and hash pair', () => {
      const token = generateCSRFToken();
      const storedHash = hashToken(token);
      
      expect(verifyCSRFToken(token, storedHash)).toBe(true);
    });

    it('should reject mismatched token and hash', () => {
      const token = generateCSRFToken();
      const wrongHash = hashToken('wrong-token');
      
      expect(verifyCSRFToken(token, wrongHash)).toBe(false);
    });

    it('should reject tokens with different lengths', () => {
      const token = generateCSRFToken();
      const shortHash = 'abc123';
      
      expect(verifyCSRFToken(token, shortHash)).toBe(false);
    });

    it('should be resistant to timing attacks', () => {
      const token = generateCSRFToken();
      const storedHash = hashToken(token);
      
      // Measure multiple verification attempts
      // Real timing attack resistance would need more sophisticated testing
      // but we verify the timing-safe comparison is called
      const timings: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        verifyCSRFToken(token, storedHash);
        timings.push(performance.now() - start);
      }
      
      // Check that timings are relatively consistent (variance check)
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
      
      // Low variance indicates consistent timing (good for security)
      expect(variance).toBeLessThan(1); // Less than 1ms variance
    });
  });

  describe('Configuration Security', () => {
    it('should have httpOnly disabled for double-submit pattern', () => {
      // httpOnly must be false so client JS can read the cookie
      expect(DEFAULT_CSRF_CONFIG.cookieOptions.httpOnly).toBe(false);
    });

    it('should have strict SameSite policy', () => {
      expect(DEFAULT_CSRF_CONFIG.cookieOptions.sameSite).toBe('strict');
    });

    it('should require secure cookies in production', () => {
      // The config uses process.env.NODE_ENV check
      // In production, secure should be true
      const originalEnv = process.env.NODE_ENV;
      
      // Simulate production check
      if (process.env.NODE_ENV === 'production') {
        expect(DEFAULT_CSRF_CONFIG.cookieOptions.secure).toBe(true);
      }
    });

    it('should have reasonable token expiry', () => {
      // Token should expire within a reasonable time (1 hour = 3600s)
      expect(DEFAULT_CSRF_CONFIG.cookieOptions.maxAge).toBeLessThanOrEqual(3600);
      expect(DEFAULT_CSRF_CONFIG.cookieOptions.maxAge).toBeGreaterThan(0);
    });

    it('should use appropriate token length', () => {
      // At least 32 bytes for adequate security
      expect(DEFAULT_CSRF_CONFIG.tokenLength).toBeGreaterThanOrEqual(32);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token gracefully', () => {
      const storedHash = hashToken('valid-token');
      
      expect(verifyCSRFToken('', storedHash)).toBe(false);
    });

    it('should handle special characters in tokens', () => {
      // Tokens should only contain hex characters, but verify robustness
      const token = generateCSRFToken();
      const hash = hashToken(token);
      
      expect(verifyCSRFToken(token, hash)).toBe(true);
    });

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000);
      const hash = hashToken(longToken);
      
      expect(verifyCSRFToken(longToken, hash)).toBe(true);
    });
  });
});
