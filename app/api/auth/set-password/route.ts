// app/api/auth/set-password/route.ts (Enterprise Grade)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Enterprise password policy
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // Optional for better UX
  maxHistoryCheck: 5, // Prevent reusing last 5 passwords
};

function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(
      `Password must be at least ${PASSWORD_POLICY.minLength} characters`
    );
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (
    PASSWORD_POLICY.requireSpecialChars &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      return NextResponse.json(
        {
          message: "Password does not meet requirements",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Generate salt and hash password
    const saltRounds = 12;
    const additionalSalt = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(
      password + additionalSalt,
      saltRounds
    );

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        credentials: {
          include: {
            passwordHistory: {
              orderBy: { createdAt: "desc" },
              take: PASSWORD_POLICY.maxHistoryCheck,
            },
          },
        },
      },
    });

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          isVerified: false, // They need to verify email after setting password
          isActive: true,
        },
        include: {
          credentials: {
            include: {
              passwordHistory: true,
            },
          },
        },
      });
    }

    // Check password history (prevent reuse)
    if (user.credentials?.passwordHistory) {
      for (const oldPassword of user.credentials.passwordHistory) {
        const matches = await bcrypt.compare(
          password + additionalSalt,
          oldPassword.passwordHash
        );
        if (matches) {
          return NextResponse.json(
            {
              message:
                "Cannot reuse a recent password. Please choose a different password.",
            },
            { status: 400 }
          );
        }
      }
    }

    const now = new Date();

    // Create or update credentials
    await prisma.$transaction(async (tx) => {
      if (user!.credentials) {
        // Store old password in history
        await tx.passwordHistory.create({
          data: {
            credentialsId: user!.credentials!.id,
            passwordHash: user!.credentials!.passwordHash,
          },
        });

        // Update existing credentials
        await tx.userCredentials.update({
          where: { userId: user!.id },
          data: {
            passwordHash,
            passwordSalt: additionalSalt,
            passwordChangedAt: now,
            failedAttempts: 0, // Reset failed attempts
            lockedAt: null,
            lockoutUntil: null,
            mustChangePassword: false,
            updatedAt: now,
          },
        });

        // Clean up old password history (keep only last N passwords)
        const oldPasswords = await tx.passwordHistory.findMany({
          where: { credentialsId: user!.credentials!.id },
          orderBy: { createdAt: "desc" },
          skip: PASSWORD_POLICY.maxHistoryCheck,
        });

        if (oldPasswords.length > 0) {
          await tx.passwordHistory.deleteMany({
            where: {
              id: {
                in: oldPasswords.map((p) => p.id),
              },
            },
          });
        }
      } else {
        // Create new credentials
        await tx.userCredentials.create({
          data: {
            userId: user!.id,
            email,
            passwordHash,
            passwordSalt: additionalSalt,
            passwordChangedAt: now,
            failedAttempts: 0,
          },
        });
      }
    });

    return NextResponse.json(
      {
        message: "Password set successfully",
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
