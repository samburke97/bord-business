// app/api/auth/set-password/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  hashPassword,
  validateSecurePassword,
  constantTimeDelay,
  sanitizeEmail,
  validateEmail,
} from "@/lib/security/password"; // FIXED: Import from password.ts, not utils.ts

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { email, password } = body;

    console.log("🔐 Set Password: Request received for email:", email);

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
      console.log(
        "❌ Set Password: Password validation failed:",
        validation.errors
      );
      await constantTimeDelay();
      return NextResponse.json(
        {
          message: "Password does not meet security requirements",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    console.log("✅ Set Password: Password validation passed");

    // Get client info for logging
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // ALWAYS hash the password first to prevent timing attacks
    const passwordHash = await hashPassword(password);

    console.log("🔍 Set Password: Looking up user...");

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
                  take: 5, // Check recent passwords
                },
              },
            },
          },
        });

        console.log("👤 Set Password: User lookup result:", {
          userFound: !!user,
          hasCredentials: !!user?.credentials,
          isVerified: user?.isVerified,
        });

        if (!user) {
          // Create new user if they don't exist
          console.log("🆕 Set Password: Creating new user...");

          user = await tx.user.create({
            data: {
              email: sanitizedEmail,
              isVerified: true, // Mark as verified since they're setting password
              isActive: true,
              globalRole: "ADMIN", // Default role for business users
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

        if (user.credentials) {
          console.log(
            "⚠️ Set Password: User already has credentials, updating..."
          );

          // User already has credentials - update them
          await tx.userCredentials.update({
            where: { id: user.credentials.id },
            data: {
              passwordHash,
              passwordChangedAt: new Date(),
              mustChangePassword: false,
              failedAttempts: 0,
              lockedAt: null,
              lockoutUntil: null,
              lastLoginAt: new Date(),
              lastLoginIp: clientIP,
              lastLoginUserAgent: userAgent,
            },
          });
        } else {
          console.log("🆕 Set Password: Creating new credentials...");

          // Create new credentials
          await tx.userCredentials.create({
            data: {
              userId: user.id,
              email: sanitizedEmail,
              passwordHash,
              passwordChangedAt: new Date(),
              mustChangePassword: false,
              failedAttempts: 0,
              lastLoginAt: new Date(),
              lastLoginIp: clientIP,
              lastLoginUserAgent: userAgent,
            },
          });
        }

        // Update user verification status
        if (!user.isVerified) {
          await tx.user.update({
            where: { id: user.id },
            data: {
              isVerified: true,
              isActive: true,
            },
          });
        }

        console.log("✅ Set Password: Password set successfully");

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
    } catch (dbError) {
      console.error("❌ Set Password: Database error:", dbError);
      await constantTimeDelay(200, 400);

      return NextResponse.json(
        { message: "Failed to set password" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Set Password: Unexpected error:", error);

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
