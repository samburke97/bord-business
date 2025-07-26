// app/api/auth/verify-email/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { message: "Email and code are required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { message: "Invalid code format" },
        { status: 400 }
      );
    }

    // Hash the code for secure comparison
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: hashedCode,
        expires: {
          gt: new Date(), // Only non-expired tokens
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { message: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if this is an existing verified user (sign-in) vs new user (setup)
    const wasAlreadyVerified = user.isVerified;

    // ✅ ENTERPRISE FIX: Update user verification status AND activate account
    await prisma.$transaction([
      // Mark user as verified, active, and completed signup
      prisma.user.update({
        where: { email },
        data: {
          isVerified: true,
          emailVerified: new Date(),
          hasCompletedSignup: true,
          status: "ACTIVE", // ✅ CRITICAL: Set email users to ACTIVE status
          emailVerifiedAt: new Date(), // ✅ ENTERPRISE: Journey tracking timestamp
          updatedAt: new Date(),
        },
      }),
      // Delete the used verification token
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: hashedCode,
          },
        },
      }),
      // Clean up any other expired tokens for this email
      prisma.verificationToken.deleteMany({
        where: {
          identifier: email,
          expires: {
            lt: new Date(),
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        message: "Email verified successfully",
        success: true,
        isExistingUser: wasAlreadyVerified,
        hasCompletedSignup: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
