// app/api/auth/create-business-account/route.ts (UPDATED WITH AUTO SIGNIN)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Enterprise password policy (same as set-password)
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
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

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      firstName,
      lastName,
      username,
      dateOfBirth,
      fullMobile,
      password,
    } = await request.json();

    // Validation
    if (
      !email ||
      !firstName ||
      !lastName ||
      !username ||
      !dateOfBirth ||
      !fullMobile ||
      !password
    ) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          message: "Password does not meet requirements",
          errors: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Check if username is available
    const existingUsername = await prisma.user.findFirst({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { message: "Username is already taken" },
        { status: 400 }
      );
    }

    // Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.isVerified) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const additionalSalt = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(
      password + additionalSalt,
      saltRounds
    );

    // Create user data
    const userData = {
      email,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      username,
      phone: fullMobile,
      dateOfBirth: new Date(dateOfBirth),
      isVerified: false, // They still need to verify email
      isActive: true,
      globalRole: "USER" as const,
    };

    // Use transaction to create user and credentials
    const result = await prisma.$transaction(async (tx) => {
      let user;

      if (existingUser) {
        // Update existing unverified user
        user = await tx.user.update({
          where: { email },
          data: userData,
        });
      } else {
        // Create new user
        user = await tx.user.create({
          data: userData,
        });
      }

      // Create user credentials
      await tx.userCredentials.create({
        data: {
          userId: user.id,
          email,
          passwordHash,
          passwordSalt: additionalSalt,
          passwordChangedAt: new Date(),
          failedAttempts: 0,
        },
      });

      return user;
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        userId: result.id,
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Account creation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
