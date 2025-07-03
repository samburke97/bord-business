// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

// Rate limiting configuration
const RATE_LIMIT = {
  maxAttempts: 3, // Max 3 emails per window
  windowMs: 15 * 60 * 1000, // 15 minutes
  cooldownMs: 60 * 1000, // 1 minute between requests
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check rate limiting
    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT.windowMs);
    const recentCooldown = new Date(now.getTime() - RATE_LIMIT.cooldownMs);

    // Count recent verification tokens for this email
    const recentTokens = await prisma.verificationToken.findMany({
      where: {
        identifier: email,
        createdAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Check cooldown period (1 minute between requests)
    if (recentTokens.length > 0) {
      const lastToken = recentTokens[0];
      if (lastToken.createdAt > recentCooldown) {
        const remainingCooldown = Math.ceil(
          (lastToken.createdAt.getTime() +
            RATE_LIMIT.cooldownMs -
            now.getTime()) /
            1000
        );
        return NextResponse.json(
          {
            message: `Please wait ${remainingCooldown} seconds before requesting another code`,
            retryAfter: remainingCooldown,
          },
          { status: 429 }
        );
      }
    }

    // Check rate limit (max 3 in 15 minutes)
    if (recentTokens.length >= RATE_LIMIT.maxAttempts) {
      const oldestToken = recentTokens[recentTokens.length - 1];
      const resetTime = Math.ceil(
        (oldestToken.createdAt.getTime() +
          RATE_LIMIT.windowMs -
          now.getTime()) /
          1000
      );
      return NextResponse.json(
        {
          message: `Too many verification attempts. Please try again in ${Math.ceil(resetTime / 60)} minutes`,
          retryAfter: resetTime,
        },
        { status: 429 }
      );
    }

    // Generate secure 4-digit verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedCode = crypto
      .createHash("sha256")
      .update(verificationCode)
      .digest("hex");
    const expires = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes expiry

    // Store verification token in database
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashedCode,
        expires,
      },
    });

    // Clean up old expired tokens for this email
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        expires: {
          lt: now,
        },
      },
    });

    // Send verification email using Resend
    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Your Verification Code - Bord Business",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Verify Your Email</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #7ceb92 0%, #59d472 100%); border-radius: 12px;">
                <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: 600;">Bord Business</h1>
                <p style="color: #000; margin: 5px 0 0 0; opacity: 0.8; font-size: 16px;">Verify Your Email Address</p>
              </div>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Your Verification Code</h2>
                
                <p style="margin-bottom: 30px; font-size: 16px; color: #666; text-align: center;">
                  Enter this 4-digit code to complete your account setup:
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
                  If you didn't request this verification code, please ignore this email or contact our support team.
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

      return NextResponse.json(
        {
          message: "Verification code sent successfully",
          expiresIn: 600, // 10 minutes in seconds
          attemptsRemaining: RATE_LIMIT.maxAttempts - recentTokens.length - 1,
        },
        { status: 200 }
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);

      // Clean up the token if email failed to send
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: email,
          token: hashedCode,
        },
      });

      return NextResponse.json(
        { message: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
