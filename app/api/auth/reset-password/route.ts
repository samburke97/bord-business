// app/api/auth/reset-password/route.ts - ENTERPRISE SECURITY VERSION
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  validateSecurePassword,
  constantTimeDelay,
  hashToken,
  secureCompare,
} from "@/lib/security/utils/utils";

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
    const hashedToken = hashToken(token);

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
          include: {
            // We'll find the user separately for better security
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
          throw new Error("Invalid or expired reset token");
        }

        // Find the user with credentials
        const user = await tx.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: {
            credentials: {
              include: {
                passwordHistory: {
                  orderBy: { createdAt: "desc" },
                  take: 10, // Check last 10 passwords
                },
              },
            },
          },
        });

        if (!user || !user.credentials) {
          await constantTimeDelay(150, 250);
          throw new Error("User not found");
        }

        // Check if account is locked
        const now = new Date();
        if (
          user.credentials.lockoutUntil &&
          user.credentials.lockoutUntil > now
        ) {
          const unlockTime = Math.ceil(
            (user.credentials.lockoutUntil.getTime() - now.getTime()) /
              1000 /
              60
          );
          throw new Error(
            `Account is locked. Try again in ${unlockTime} minutes.`
          );
        }

        // Check password history to prevent reuse
        for (const oldPassword of user.credentials.passwordHistory) {
          if (await verifyPassword(newPassword, oldPassword.passwordHash)) {
            throw new Error(
              "Cannot reuse a recent password. Please choose a different password."
            );
          }
        }

        // Store current password in history before updating
        await tx.passwordHistory.create({
          data: {
            credentialsId: user.credentials.id,
            passwordHash: user.credentials.passwordHash,
          },
        });

        // Update user credentials with new password
        await tx.userCredentials.update({
          where: { userId: user.id },
          data: {
            passwordHash: newPasswordHash,
            passwordChangedAt: now,
            failedAttempts: 0, // Reset failed attempts
            lockedAt: null,
            lockoutUntil: null,
            mustChangePassword: false,
            lastFailedAttempt: null,
            updatedAt: now,
          },
        });

        // Clean up old password history (keep only last 10)
        const oldPasswords = await tx.passwordHistory.findMany({
          where: { credentialsId: user.credentials.id },
          orderBy: { createdAt: "desc" },
          skip: 10, // Keep 10, delete the rest
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

        // Mark the reset token as used and delete it
        await tx.passwordResetToken.update({
          where: { id: resetToken.id },
          data: {
            usedAt: now,
          },
        });

        // Delete the used token
        await tx.passwordResetToken.delete({
          where: { id: resetToken.id },
        });

        // Clean up any other expired reset tokens for this email
        await tx.passwordResetToken.deleteMany({
          where: {
            email: email.toLowerCase().trim(),
            expires: {
              lt: now,
            },
          },
        });

        // Log security event
        await tx.securityEvent.create({
          data: {
            credentialsId: user.credentials.id,
            eventType: "PASSWORD_RESET_COMPLETED",
            description: "Password successfully reset via email link",
            ipAddress:
              request.headers.get("x-forwarded-for") ||
              request.headers.get("x-real-ip") ||
              "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
          },
        });

        return { success: true, userId: user.id };
      });

      // Ensure minimum response time for security
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 200) {
        await new Promise((resolve) => setTimeout(resolve, 200 - elapsedTime));
      }

      return NextResponse.json(
        {
          message: "Password updated successfully",
          success: true,
        },
        { status: 200 }
      );
    } catch (transactionError) {
      // Log the actual error for debugging (don't expose to user)
      console.error("Password reset transaction error:", transactionError);

      // Always consume consistent time for errors
      await constantTimeDelay(150, 250);

      // Generic error message to prevent information leakage
      return NextResponse.json(
        {
          message:
            "Password reset failed. Please try again or request a new reset link.",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Password reset error:", error);

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
