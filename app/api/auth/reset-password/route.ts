// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Password policy (same as other auth routes)
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
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
    const { token, email, newPassword } = body;

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { message: "Token, email, and new password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        {
          message: "Password does not meet requirements",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Hash the token for secure comparison
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find the password reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        email,
        token: hashedToken,
        expires: {
          gt: new Date(), // Only non-expired tokens
        },
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        { message: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Find the user with credentials
    const user = await prisma.user.findUnique({
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

    if (!user || !user.credentials) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check password history (prevent reuse)
    if (user.credentials.passwordHistory) {
      for (const oldPassword of user.credentials.passwordHistory) {
        const matches = await bcrypt.compare(
          newPassword + user.credentials.passwordSalt,
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

    // Generate new salt and hash password
    const saltRounds = 12;
    const additionalSalt = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(
      newPassword + additionalSalt,
      saltRounds
    );

    const now = new Date();

    // Update password in transaction
    await prisma.$transaction(async (tx) => {
      // Store old password in history
      if (user.credentials) {
        await tx.passwordHistory.create({
          data: {
            credentialsId: user.credentials.id,
            passwordHash: user.credentials.passwordHash,
          },
        });

        // Update credentials with new password
        await tx.userCredentials.update({
          where: { userId: user.id },
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
          where: { credentialsId: user.credentials.id },
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
      }

      // Delete the used reset token
      await tx.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      // Clean up any other expired reset tokens for this email
      await tx.passwordResetToken.deleteMany({
        where: {
          email,
          expires: {
            lt: now,
          },
        },
      });
    });

    return NextResponse.json(
      {
        message: "Password updated successfully",
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
