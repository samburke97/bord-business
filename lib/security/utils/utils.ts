import { NextRequest } from "next/server";

// ============================================================================
// EDGE-COMPATIBLE CRYPTO FUNCTIONS
// ============================================================================

// Use Web Crypto API (available in Edge Runtime)
const crypto = globalThis.crypto;

export async function constantTimeDelay(
  minMs: number = 100,
  maxMs: number = 200
): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// SECURE TOKEN GENERATION (Edge-compatible)
// ============================================================================

export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

// ============================================================================
// RATE LIMITING SYSTEM (Edge-compatible)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
  keyGenerator: (req: NextRequest) => string;
}

export function createRateLimit(config: RateLimitConfig) {
  return (
    request: NextRequest
  ): { allowed: boolean; remaining: number; resetTime?: number } => {
    const key = config.keyGenerator(request);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now && !v.blocked) {
        rateLimitStore.delete(k);
      }
    }

    const current = rateLimitStore.get(key);

    // Check if currently blocked
    if (current?.blocked && current.resetTime > now) {
      return { allowed: false, remaining: 0, resetTime: current.resetTime };
    }

    // Remove block if expired
    if (current?.blocked && current.resetTime <= now) {
      rateLimitStore.delete(key);
    }

    // First request in window
    if (!current || current.resetTime <= windowStart) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false,
      });
      return { allowed: true, remaining: config.maxRequests - 1 };
    }

    // Increment counter
    current.count++;

    // Check if exceeded limit
    if (current.count > config.maxRequests) {
      // Block for extended period if configured
      if (config.blockDurationMs) {
        current.blocked = true;
        current.resetTime = now + config.blockDurationMs;
      }
      return { allowed: false, remaining: 0, resetTime: current.resetTime };
    }

    return { allowed: true, remaining: config.maxRequests - current.count };
  };
}

// Rate limit configurations
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per window
  blockDurationMs: 30 * 60 * 1000, // 30 min block after limit
  keyGenerator: (req) =>
    `auth:${req.ip || req.headers.get("x-forwarded-for") || "unknown"}`,
});

export const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 reset attempts per hour
  blockDurationMs: 24 * 60 * 60 * 1000, // 24 hour block
  keyGenerator: (req) =>
    `reset:${req.ip || req.headers.get("x-forwarded-for") || "unknown"}`,
});

export const verificationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // 3 verification emails per window
  keyGenerator: (req) =>
    `verify:${req.ip || req.headers.get("x-forwarded-for") || "unknown"}`,
});

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): boolean {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function sanitizeString(input: string, maxLength: number = 255): string {
  return input.trim().slice(0, maxLength);
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

export function generateCSRFToken(): string {
  return generateSecureToken(32);
}

export function validateCSRFToken(
  token: string | null,
  sessionToken: string | null
): boolean {
  if (!token || !sessionToken) {
    return false;
  }

  return secureCompare(token, sessionToken);
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
};
