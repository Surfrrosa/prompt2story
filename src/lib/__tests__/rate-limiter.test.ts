import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rateLimit, rateLimiters, clearRateLimitState } from '../rate-limiter.js';

// Mock VercelRequest
const createMockRequest = (ip: string = '127.0.0.1') => ({
  connection: { remoteAddress: ip },
  socket: { remoteAddress: ip },
  headers: {}
} as any);

describe('Rate Limiting Infrastructure', () => {
  beforeEach(() => {
    // Clear rate limiting cache between tests
    vi.clearAllTimers();
    vi.useFakeTimers();
    clearRateLimitState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rate Limiter Core Functionality', () => {
    it('should allow requests within limit', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 5 });
      const req = createMockRequest();

      // First request should be allowed
      const result1 = limiter(req);
      expect(result1.allowed).toBe(true);
      expect(result1.remainingRequests).toBe(4);

      // Second request should be allowed
      const result2 = limiter(req);
      expect(result2.allowed).toBe(true);
      expect(result2.remainingRequests).toBe(3);
    });

    it('should block requests when limit exceeded', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 2 });
      const req = createMockRequest();

      // Use up the limit
      limiter(req); // 1st request
      limiter(req); // 2nd request

      // 3rd request should be blocked
      const result = limiter(req);
      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
      expect(result.headers['Retry-After']).toBeDefined();
    });

    it('should reset after window expires', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 1 });
      const req = createMockRequest();

      // Use up the limit
      const result1 = limiter(req);
      expect(result1.allowed).toBe(true);

      // Exceed limit
      const result2 = limiter(req);
      expect(result2.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      const result3 = limiter(req);
      expect(result3.allowed).toBe(true);
      expect(result3.remainingRequests).toBe(0);
    });

    it('should track different IPs separately', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 1 });
      const req1 = createMockRequest('192.168.1.1');
      const req2 = createMockRequest('192.168.1.2');

      // First IP uses up its limit
      const result1 = limiter(req1);
      expect(result1.allowed).toBe(true);

      const result2 = limiter(req1);
      expect(result2.allowed).toBe(false);

      // Second IP should still be allowed
      const result3 = limiter(req2);
      expect(result3.allowed).toBe(true);
    });

    it('should handle X-Forwarded-For header', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 1 });
      const req = {
        ...createMockRequest(),
        headers: { 'x-forwarded-for': '203.0.113.1, 70.41.3.18, 150.172.238.178' }
      };

      const result = limiter(req);
      expect(result.allowed).toBe(true);

      // Same forwarded IP should be rate limited
      const req2 = {
        ...createMockRequest('different-ip'),
        headers: { 'x-forwarded-for': '203.0.113.1, 70.41.3.18, 150.172.238.178' }
      };

      const result2 = limiter(req2);
      expect(result2.allowed).toBe(false);
    });

    it('should include correct rate limit headers', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 10 });
      const req = createMockRequest();

      const result = limiter(req);

      expect(result.headers).toEqual(
        expect.objectContaining({
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '9',
          'X-RateLimit-Reset': expect.any(String)
        })
      );

      expect(result.headers['Retry-After']).toBeUndefined();
    });

    it('should include Retry-After header when rate limited', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 1 });
      const req = createMockRequest();

      // Use up the limit
      limiter(req);

      // Get rate limited
      const result = limiter(req);
      expect(result.allowed).toBe(false);
      expect(result.headers['Retry-After']).toMatch(/^\d+$/);
      expect(parseInt(result.headers['Retry-After'])).toBeGreaterThan(0);
    });
  });

  describe('Predefined Rate Limiters', () => {
    it('should have correct limits for standard endpoints', () => {
      const req = createMockRequest();
      const result = rateLimiters.standard(req);

      expect(result.allowed).toBe(true);
      expect(result.headers['X-RateLimit-Limit']).toBe('30');
    });

    it('should have correct limits for generation endpoints', () => {
      const req = createMockRequest();
      const result = rateLimiters.generation(req);

      expect(result.allowed).toBe(true);
      expect(result.headers['X-RateLimit-Limit']).toBe('10');
    });

    it('should have correct limits for upload endpoints', () => {
      const req = createMockRequest();
      const result = rateLimiters.upload(req);

      expect(result.allowed).toBe(true);
      expect(result.headers['X-RateLimit-Limit']).toBe('5');
    });

    it('should have correct limits for health endpoints', () => {
      const req = createMockRequest();
      const result = rateLimiters.health(req);

      expect(result.allowed).toBe(true);
      expect(result.headers['X-RateLimit-Limit']).toBe('60');
    });
  });

  describe('Custom Key Generator', () => {
    it('should use custom key generator when provided', () => {
      const customKeyGen = vi.fn().mockReturnValue('custom-key');
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: customKeyGen
      });

      const req1 = createMockRequest('192.168.1.1');
      const req2 = createMockRequest('192.168.1.2');

      // Both requests should use the same custom key
      limiter(req1);
      const result = limiter(req2);

      expect(customKeyGen).toHaveBeenCalledTimes(2);
      expect(result.allowed).toBe(false); // Should be blocked because same key
    });
  });
});