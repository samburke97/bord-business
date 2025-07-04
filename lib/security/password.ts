// lib/security/password.ts - NODE.JS ONLY (for API routes)
import * as argon2 from "argon2";
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";

// ============================================================================
// ARGON2 PASSWORD SECURITY (NODE.JS ONLY)
// ============================================================================

const ARGON2_OPTIONS = {
  type: argon2.argon2id, // Most secure variant
  memoryCost: 2 ** 16, // 64 MB memory usage
  timeCost: 3, // 3 iterations
  parallelism: 1, // Single thread
  saltLength: 32, // 32-byte salt
};

export async function hashPassword(password: string): Promise<string> {
  try {
    // Add pepper from environment for additional security
    const pepper = process.env.ARGON2_SECRET_PEPPER || "";
    const passwordWithPepper = password + pepper;

    return await argon2.hash(passwordWithPepper, ARGON2_OPTIONS);
  } catch (error) {
    console.error("Password hashing failed:", error);
    throw new Error("Password hashing failed");
  }
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const pepper = process.env.ARGON2_SECRET_PEPPER || "";
    const passwordWithPepper = password + pepper;

    return await argon2.verify(hash, passwordWithPepper);
  } catch (error) {
    console.error("Password verification failed:", error);
    return false;
  }
}

// ============================================================================
// TIMING ATTACK PROTECTION (NODE.JS)
// ============================================================================

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

  try {
    const bufferA = Buffer.from(a, "utf8");
    const bufferB = Buffer.from(b, "utf8");
    return timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

// ============================================================================
// SECURE TOKEN GENERATION (NODE.JS)
// ============================================================================

export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ============================================================================
// SECURE PASSWORD POLICY
// ============================================================================

export const SECURE_PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxHistoryCheck: 10,
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
  lockoutThreshold: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
};

export function validateSecurePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password) {
    errors.push("Password is required");
    return { valid: false, errors };
  }

  if (password.length < SECURE_PASSWORD_POLICY.minLength) {
    errors.push(
      `Password must be at least ${SECURE_PASSWORD_POLICY.minLength} characters`
    );
  }

  if (password.length > SECURE_PASSWORD_POLICY.maxLength) {
    errors.push(
      `Password must be less than ${SECURE_PASSWORD_POLICY.maxLength} characters`
    );
  }

  if (SECURE_PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (SECURE_PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (SECURE_PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (
    SECURE_PASSWORD_POLICY.requireSpecialChars &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    errors.push(
      'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)'
    );
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push("Password cannot contain three or more repeating characters");
  }

  if (/123|abc|qwerty|password|admin|login/i.test(password)) {
    errors.push("Password cannot contain common patterns or words");
  }

  // Check for keyboard patterns
  if (/qwerty|asdf|zxcv|1234|abcd/i.test(password)) {
    errors.push("Password cannot contain keyboard patterns");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): boolean {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%^&*(),.?":{}|<>-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function sanitizeString(input: string, maxLength: number = 255): string {
  return input.trim().slice(0, maxLength);
}

// ============================================================================
// ACCOUNT LOCKOUT SYSTEM
// ============================================================================

export async function checkAccountLockout(
  userId: string
): Promise<{ locked: boolean; unlockTime?: Date }> {
  const credentials = await prisma.userCredentials.findUnique({
    where: { userId },
    select: {
      failedAttempts: true,
      lockedAt: true,
      lockoutUntil: true,
    },
  });

  if (!credentials) {
    return { locked: false };
  }

  const now = new Date();

  // Check if currently locked
  if (credentials.lockoutUntil && credentials.lockoutUntil > now) {
    return {
      locked: true,
      unlockTime: credentials.lockoutUntil,
    };
  }

  // Auto-unlock if lockout period has passed
  if (credentials.lockoutUntil && credentials.lockoutUntil <= now) {
    await prisma.userCredentials.update({
      where: { userId },
      data: {
        failedAttempts: 0,
        lockedAt: null,
        lockoutUntil: null,
      },
    });
    return { locked: false };
  }

  return { locked: false };
}

export async function recordFailedAttempt(userId: string): Promise<void> {
  const credentials = await prisma.userCredentials.findUnique({
    where: { userId },
    select: { failedAttempts: true },
  });

  if (!credentials) return;

  const newFailedAttempts = credentials.failedAttempts + 1;
  const now = new Date();

  const updateData: any = {
    failedAttempts: newFailedAttempts,
    lastFailedAttempt: now,
  };

  // Lock account if threshold reached
  if (newFailedAttempts >= SECURE_PASSWORD_POLICY.lockoutThreshold) {
    updateData.lockedAt = now;
    updateData.lockoutUntil = new Date(
      now.getTime() + SECURE_PASSWORD_POLICY.lockoutDuration
    );
  }

  await prisma.userCredentials.update({
    where: { userId },
    data: updateData,
  });
}

export async function resetFailedAttempts(userId: string): Promise<void> {
  await prisma.userCredentials.update({
    where: { userId },
    data: {
      failedAttempts: 0,
      lockedAt: null,
      lockoutUntil: null,
      lastFailedAttempt: null,
    },
  });
}
