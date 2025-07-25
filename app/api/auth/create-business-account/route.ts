// app/api/auth/create-business-account/route.ts - FIXED: Proper email handling
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

// reCAPTCHA verification function
async function verifyRecaptcha(token: string): Promise<{
  success: boolean;
  score?: number;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      }
    );

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data["error-codes"]?.join(", ") || "Verification failed",
      };
    }

    return {
      success: true,
      score: data.score,
    };
  } catch (error) {
    return {
      success: false,
      error: "reCAPTCHA verification failed",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      firstName,
      lastName,
      dateOfBirth,
      fullMobile,
      password,
      recaptchaToken,
    } = await request.json();

    // reCAPTCHA verification
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaResult.success) {
      return NextResponse.json(
        {
          message: "Security verification failed. Please try again.",
          code: "RECAPTCHA_FAILED",
        },
        { status: 400 }
      );
    }

    // Validation
    if (
      !email ||
      !firstName ||
      !lastName ||
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

    // ENTERPRISE RULE: Check if user already exists with OAuth accounts
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
      include: {
        accounts: true,
        credentials: true,
      },
    });

    if (existingUser) {
      // BLOCK: User exists with OAuth providers
      if (existingUser.accounts.length > 0) {
        const oauthProviders = existingUser.accounts.map((acc) => acc.provider);
        return NextResponse.json(
          {
            message: "Account already exists with different sign-in method",
            error: "ACCOUNT_EXISTS_OAUTH",
            availableMethods: oauthProviders,
          },
          { status: 409 }
        );
      }

      // BLOCK: User exists with verified email/password
      if (existingUser.isVerified && existingUser.credentials?.passwordHash) {
        return NextResponse.json(
          {
            message: "Account already exists with email and password",
            error: "ACCOUNT_EXISTS_EMAIL",
          },
          { status: 409 }
        );
      }

      // ALLOW: User exists but unverified or incomplete
      // This handles the case where user started signup but didn't complete verification
    }

    // Hash password with enterprise-grade security
    const passwordHash = await hashPassword(password);

    // Create user and credentials in transaction
    const result = await prisma.$transaction(async (tx) => {
      // If user exists but incomplete, update them
      if (existingUser && !existingUser.isVerified) {
        const updatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`,
            phone: fullMobile,
            dateOfBirth: new Date(dateOfBirth),
            globalRole: "USER",
            status: "ACTIVE",
            isActive: true,
            isVerified: false, // Will be verified via email
          },
        });

        // Update or create credentials
        await tx.userCredentials.upsert({
          where: { userId: existingUser.id },
          update: {
            passwordHash,
          },
          create: {
            userId: existingUser.id,
            email: sanitizedEmail,
            passwordHash,
          },
        });

        return updatedUser;
      }

      // Create new user
      const newUser = await tx.user.create({
        data: {
          email: sanitizedEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: fullMobile,
          dateOfBirth: new Date(dateOfBirth),
          globalRole: "USER",
          status: "ACTIVE",
          isActive: true,
          isVerified: false, // Will be verified via email
        },
      });

      // Create user credentials
      await tx.userCredentials.create({
        data: {
          userId: newUser.id,
          email: sanitizedEmail,
          passwordHash,
        },
      });

      return newUser;
    });

    // Generate verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedCode = crypto
      .createHash("sha256")
      .update(verificationCode)
      .digest("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: sanitizedEmail,
        token: hashedCode,
        expires,
      },
    });

    // Send verification email - FIXED with proper error handling
    try {
      const emailResult = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@bordsports.com", // ← Use same format as working API
        to: sanitizedEmail,
        subject: "Welcome to Bord Business - Verify Your Email",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to Bord Business!</h1>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                  Hi ${firstName},<br><br>
                  Welcome to Bord Business! We're excited to have you on board. To complete your account setup, please verify your email address using the code below:
                </p>
                
                <div style="background: #f8f8f8; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
                  <p style="color: #333; margin: 0; font-size: 14px;">Your verification code is:</p>
                  <h2 style="color: #10b981; font-size: 32px; margin: 10px 0; letter-spacing: 4px; font-weight: bold;">${verificationCode}</h2>
                  <p style="color: #666; margin: 0; font-size: 12px;">This code expires in 10 minutes</p>
                </div>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                  Enter this code on the verification page to activate your account and start managing your business on Bord.
                </p>
                
                <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                  © ${new Date().getFullYear()} Bord Sports Ltd. All rights reserved.<br>
                  This is an automated message, please do not reply.
                </p>
              </div>
            </body>
          </html>
        `,
      });

      // Check if email failed due to any issues
      if (emailResult.error) {
        console.error("❌ Email sending error:", emailResult.error);

        // Clean up the token if email failed to send
        await prisma.verificationToken.deleteMany({
          where: {
            identifier: sanitizedEmail,
            token: hashedCode,
          },
        });

        return NextResponse.json(
          {
            message:
              "Account created but failed to send verification email. Please try again.",
            userId: result.id,
            emailSent: false,
          },
          { status: 201 }
        );
      }

      console.log(
        "✅ Verification email sent successfully to:",
        sanitizedEmail
      );

      return NextResponse.json(
        {
          message: "Account created successfully",
          userId: result.id,
          success: true,
          emailSent: true,
        },
        { status: 201 }
      );
    } catch (emailError) {
      console.error("❌ Email sending error:", emailError);

      // Clean up the token if email failed to send
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: sanitizedEmail,
          token: hashedCode,
        },
      });

      return NextResponse.json(
        {
          message:
            "Account created but failed to send verification email. Please use the resend option.",
          userId: result.id,
          emailSent: false,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("❌ Create business account error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
