/**
 * Rate limiting utilities for API endpoints
 * Uses in-memory store for development, designed to be upgraded to Redis/KV for production
 */

import type { VercelRequest } from '@vercel/node';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: VercelRequest) => string; // Custom key generator
}

interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  headers: Record<string, string>;
}

// In-memory store (will be replaced with Redis/KV in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Export function to clear state (for testing)
export function clearRateLimitState(): void {
  requestCounts.clear();
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientKey(req: VercelRequest): string {
  // Try to get real IP from headers (behind Vercel proxy)
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];

  let ip = req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';

  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0]?.trim() || ip;
  } else if (typeof realIp === 'string') {
    ip = realIp;
  } else if (typeof cfConnectingIp === 'string') {
    ip = cfConnectingIp;
  }

  return `ip:${ip}`;
}

export function rateLimit(options: RateLimitOptions) {
  return function checkRateLimit(req: VercelRequest): RateLimitResult {
    const key = options.keyGenerator ? options.keyGenerator(req) : getClientKey(req);
    const now = Date.now();
    const windowStart = now;
    const resetTime = windowStart + options.windowMs;

    // Get or create entry
    let entry = requestCounts.get(key);

    // Reset if window expired
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime };
      requestCounts.set(key, entry);
    }

    // Increment count
    entry.count++;

    const allowed = entry.count <= options.maxRequests;
    const remainingRequests = Math.max(0, options.maxRequests - entry.count);

    // Prepare headers
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': options.maxRequests.toString(),
      'X-RateLimit-Remaining': remainingRequests.toString(),
      'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
    };

    if (!allowed) {
      headers['Retry-After'] = Math.ceil((entry.resetTime - now) / 1000).toString();
    }

    return {
      allowed,
      remainingRequests,
      resetTime: entry.resetTime,
      headers
    };
  };
}

// Predefined rate limiters for different endpoint types
export const rateLimiters = {
  // Standard API endpoints - 30 requests per minute per IP
  standard: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  }),

  // AI generation endpoints - 10 requests per minute per IP (more expensive)
  generation: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
  }),

  // File upload endpoints - 5 requests per minute per IP (most expensive)
  upload: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5
  }),

  // Health check - 60 requests per minute per IP
  health: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60
  })
};

export default rateLimit;