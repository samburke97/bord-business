// app/api/auth/set-password/route.ts - ENTERPRISE SECURITY VERSION
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  validateSecurePassword,
  constantTimeDelay,
  sanitizeEmail,
  validateEmail,
} from "@/lib/security/utils/utils";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { email, password } = body;

    // Input validation
    if (!email || !password) {
      await constantTimeDelay();
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const sanitizedEmail = sanitizeEmail(email);

    if (!validateEmail(sanitizedEmail)) {
      await constantTimeDelay();
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validateSecurePassword(password);
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

    // Get client info for logging
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // ALWAYS hash the password first to prevent timing attacks
    const passwordHash = await hashPassword(password);

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Check if user exists
        let user = await tx.user.findUnique({
          where: { email: sanitizedEmail },
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

        // Create user if doesn't exist
        if (!user) {
          user = await tx.user.create({
            data: {
              email: sanitizedEmail,
              isVerified: false, // They need to verify email after setting password
              isActive: true,
              hasCompletedSignup: false,
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

        // Check if user already has credentials (password already set)
        if (user.credentials) {
          // Check password history to prevent reuse
          for (const oldPassword of user.credentials.passwordHistory) {
            if (await verifyPassword(password, oldPassword.passwordHash)) {
              throw new Error(
                "Cannot reuse a recent password. Please choose a different password."
              );
            }
          }

          // Check current password
          if (await verifyPassword(password, user.credentials.passwordHash)) {
            throw new Error(
              "Cannot reuse your current password. Please choose a different password."
            );
          }

          // Store current password in history
          await tx.passwordHistory.create({
            data: {
              credentialsId: user.credentials.id,
              passwordHash: user.credentials.passwordHash,
            },
          });

          // Update existing credentials
          await tx.userCredentials.update({
            where: { userId: user.id },
            data: {
              passwordHash,
              passwordChangedAt: new Date(),
              failedAttempts: 0,
              lockedAt: null,
              lockoutUntil: null,
              mustChangePassword: false,
              lastFailedAttempt: null,
              updatedAt: new Date(),
            },
          });

          // Log password change
          await tx.securityEvent.create({
            data: {
              credentialsId: user.credentials.id,
              eventType: "PASSWORD_CHANGED",
              description: "Password updated via set-password endpoint",
              ipAddress: clientIP,
              userAgent: userAgent,
            },
          });
        } else {
          // Create new credentials
          const newCredentials = await tx.userCredentials.create({
            data: {
              userId: user.id,
              email: sanitizedEmail,
              passwordHash,
              passwordChangedAt: new Date(),
              failedAttempts: 0,
              mfaEnabled: false,
            },
          });

          // Log initial password creation
          await tx.securityEvent.create({
            data: {
              credentialsId: newCredentials.id,
              eventType: "PASSWORD_CHANGED",
              description: "Initial password set for new account",
              ipAddress: clientIP,
              userAgent: userAgent,
            },
          });
        }

        return { success: true, userId: user.id };
      });

      // Ensure minimum response time
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 200) {
        await new Promise((resolve) => setTimeout(resolve, 200 - elapsedTime));
      }

      return NextResponse.json(
        {
          message: "Password set successfully",
          success: true,
        },
        { status: 200 }
      );
    } catch (transactionError) {
      console.error("Set password transaction error:", transactionError);
      await constantTimeDelay();

      // Return specific error message for password reuse
      if (
        transactionError instanceof Error &&
        transactionError.message.includes("Cannot reuse")
      ) {
        return NextResponse.json(
          { message: transactionError.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: "Failed to set password. Please try again." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Set password error:", error);

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
