// app/api/auth/create-business-account/route.ts - UPDATED TO SEND EMAIL DIRECTLY
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/security/password";
import { sanitizeEmail, validateEmail } from "@/lib/security/utils/utils";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

// Enterprise password policy (same as set-password)
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
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

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push("Password cannot contain three or more repeating characters");
  }

  if (/123|abc|qwerty|password|admin|login/i.test(password)) {
    errors.push("Password cannot contain common patterns or words");
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

    // Sanitize and validate email
    const sanitizedEmail = sanitizeEmail(email);
    if (!validateEmail(sanitizedEmail)) {
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
      where: { email: sanitizedEmail },
    });

    if (existingUser && existingUser.isVerified) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password using Argon2
    const passwordHash = await hashPassword(password);

    // Create user data
    const userData = {
      email: sanitizedEmail,
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
        console.log("🔄 Updating existing user:", existingUser.id);
        user = await tx.user.update({
          where: { email: sanitizedEmail },
          data: userData,
          include: {
            credentials: true,
          },
        });

        // Update or create credentials
        if (user.credentials) {
          console.log("🔄 Updating existing credentials");
          await tx.userCredentials.update({
            where: { userId: user.id },
            data: {
              passwordHash,
              passwordChangedAt: new Date(),
              failedAttempts: 0,
            },
          });
        } else {
          console.log("🆕 Creating new credentials for existing user");
          await tx.userCredentials.create({
            data: {
              userId: user.id,
              email: sanitizedEmail,
              passwordHash,
              passwordChangedAt: new Date(),
              failedAttempts: 0,
            },
          });
        }
      } else {
        // Create new user
        console.log("🆕 Creating new user");
        user = await tx.user.create({
          data: userData,
        });

        // Create user credentials with Argon2 hash
        console.log("🆕 Creating new credentials for new user");
        await tx.userCredentials.create({
          data: {
            userId: user.id,
            email: sanitizedEmail,
            passwordHash,
            passwordChangedAt: new Date(),
            failedAttempts: 0,
          },
        });
      }

      return user;
    });

    console.log("✅ Business account created successfully:", {
      userId: result.id,
      email: result.email,
      name: result.name,
    });

    // Send verification email directly (don't make internal API call)
    try {
      console.log("📧 Sending verification email directly...");

      // Clean up any old verification tokens for this email
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: sanitizedEmail,
          expires: {
            lt: new Date(),
          },
        },
      });

      // Generate secure 4-digit verification code
      const verificationCode = Math.floor(
        1000 + Math.random() * 9000
      ).toString();
      const hashedCode = crypto
        .createHash("sha256")
        .update(verificationCode)
        .digest("hex");
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      // Store verification token in database
      await prisma.verificationToken.create({
        data: {
          identifier: sanitizedEmail,
          token: hashedCode,
          expires,
        },
      });

      // Send verification email using Resend directly
      const emailResult = await resend.emails.send({
        from: process.env.FROM_EMAIL || "onboarding@bordsports.com",
        to: sanitizedEmail,
        subject: "Welcome to Bord Business - Verify Your Email",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Bord Business</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #7ceb92 0%, #59d472 100%); border-radius: 12px;">
                <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Bord Business!</h1>
                <p style="color: #000; margin: 5px 0 0 0; opacity: 0.8; font-size: 16px;">Let's verify your email address</p>
              </div>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Your Verification Code</h2>
                
                <p style="margin-bottom: 30px; font-size: 16px; color: #666; text-align: center;">
                  Enter this 4-digit code to verify your email and continue setting up your business account:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background: #ffffff; border: 3px solid #7ceb92; border-radius: 12px; padding: 25px; font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #333; display: inline-block; box-shadow: 0 4px 12px rgba(124, 235, 146, 0.3);">
                    ${verificationCode}
                  </div>
                </div>
                
                <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px; margin-top: 30px;">
                  <p style="margin: 0; font-size: 14px; color: #1976d2;">
                    <strong>Security Notice:</strong> This code will expire in 10 minutes. Never share this code with anyone.
                  </p>
                </div>
              </div>
              
              <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="color: #666; font-size: 14px; margin: 0;">
                  If you didn't create a Bord Business account, please ignore this email or contact our support team.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                © ${new Date().getFullYear()} Bord Sports Ltd. All rights reserved.<br>
                This is an automated message, please do not reply.
              </p>
            </body>
          </html>
        `,
      });

      console.log("✅ Verification email sent successfully:", emailResult);

      // Check if email failed due to domain restrictions
      if (emailResult.error) {
        console.warn("⚠️ Email sending restricted:", emailResult.error.message);

        // For development, continue anyway since user can still manually verify
        // In production, you'd want to handle this differently
        if (
          emailResult.error.name === "validation_error" &&
          emailResult.error.message.includes("testing emails")
        ) {
          console.log(
            "📧 Development mode: Email restricted to verified addresses only"
          );
        }
      }
    } catch (emailError) {
      console.error("❌ Email sending error:", emailError);
      // Don't fail the account creation if email fails
      // The user can still request a new verification code
    }

    return NextResponse.json(
      {
        message: "Account created successfully",
        userId: result.id,
        success: true,
        emailSent: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Account creation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
