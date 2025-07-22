import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  validateSecurePassword,
  constantTimeDelay,
  hashToken,
  secureCompare,
} from "@/lib/security/password";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { token, email, newPassword } = body;

    // Input validation
    if (!token || !email || !newPassword) {
      await constantTimeDelay();
      return NextResponse.json(
        { message: "Token, email, and new password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validateSecurePassword(newPassword);
    if (!validation.valid) {
      await constantTimeDelay();
      return NextResponse.json(
        {
          message: "Password does not meet security requirements",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // ALWAYS hash the password first to prevent timing attacks
    const newPasswordHash = await hashPassword(newPassword);

    // Hash the provided token for secure comparison
    const hashedToken = hashToken(token); // FIXED: Now using sync version from password.ts

    try {
      // Use transaction for atomic operations
      const result = await prisma.$transaction(async (tx) => {
        // Find the password reset token with user data
        const resetToken = await tx.passwordResetToken.findFirst({
          where: {
            email: email.toLowerCase().trim(),
            expires: {
              gt: new Date(), // Only non-expired tokens
            },
          },
        });

        // Always consume consistent time even if token not found
        if (!resetToken) {
          await constantTimeDelay(150, 250);
          throw new Error("Invalid or expired reset token");
        }

        // Secure token comparison using timing-safe comparison
        if (!secureCompare(resetToken.token, hashedToken)) {
          await constantTimeDelay(150, 250);
          throw new Error("Invalid reset token");
        }

        // Find the user with credentials
        const user = await tx.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: {
            credentials: {
              include: {
                passwordHistory: {
                  orderBy: { createdAt: "desc" },
                  take: 10,
                },
              },
            },
          },
        });

        if (!user || !user.credentials) {
          await constantTimeDelay(150, 250);
          throw new Error("User not found");
        }

        // Check password history (prevent reuse of recent passwords)
        if (user.credentials.passwordHistory) {
          for (const oldPassword of user.credentials.passwordHistory) {
            const isReused = await verifyPassword(
              newPassword,
              oldPassword.passwordHash
            );
            if (isReused) {
              throw new Error(
                "Cannot reuse a recent password. Please choose a different password."
              );
            }
          }
        }

        // Check if new password is same as current
        const isSameAsCurrent = await verifyPassword(
          newPassword,
          user.credentials.passwordHash
        );
        if (isSameAsCurrent) {
          throw new Error(
            "New password cannot be the same as your current password."
          );
        }

        // Add current password to history before updating
        await tx.passwordHistory.create({
          data: {
            credentialsId: user.credentials.id,
            passwordHash: user.credentials.passwordHash,
          },
        });

        // Update the password
        await tx.userCredentials.update({
          where: { id: user.credentials.id },
          data: {
            passwordHash: newPasswordHash,
            passwordChangedAt: new Date(),
            mustChangePassword: false,
            failedAttempts: 0,
            lockedAt: null,
            lockoutUntil: null,
          },
        });

        // Delete all password reset tokens for this user
        await tx.passwordResetToken.deleteMany({
          where: {
            email: email.toLowerCase().trim(),
          },
        });

        // Log security event
        await tx.securityEvent.create({
          data: {
            credentialsId: user.credentials.id,
            eventType: "PASSWORD_RESET_COMPLETED",
            description: "Password successfully reset via email token",
            ipAddress:
              request.headers.get("x-forwarded-for") ||
              request.headers.get("x-real-ip") ||
              "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
          },
        });

        return { success: true, userId: user.id };
      });

      // Ensure minimum response time
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 200) {
        await new Promise((resolve) => setTimeout(resolve, 200 - elapsedTime));
      }

      return NextResponse.json(
        {
          message: "Password reset successfully",
          success: true,
        },
        { status: 200 }
      );
    } catch (transactionError) {
      await constantTimeDelay(150, 250);

      return NextResponse.json(
        {
          message:
            transactionError instanceof Error
              ? transactionError.message
              : "Invalid or expired reset token",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    // Ensure minimum response time
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime < 200) {
      await new Promise((resolve) => setTimeout(resolve, 200 - elapsedTime));
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
