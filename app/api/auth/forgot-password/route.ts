// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        credentials: true,
      },
    });

    // Always return success to prevent email enumeration attacks
    // But only send email if user actually exists
    if (user && user.credentials) {
      // Clean up any old password reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: {
          email,
          expires: {
            lt: new Date(),
          },
        },
      });

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      // Store reset token in database
      await prisma.passwordResetToken.create({
        data: {
          email,
          token: hashedToken,
          expires,
        },
      });

      // Create reset URL
      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

      // Send password reset email
      try {
        await resend.emails.send({
          from: "onboarding@resend.dev",
          to: email,
          subject: "Reset Your Bord Business Password",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #7ceb92 0%, #59d472 100%); border-radius: 12px;">
                  <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
                  <p style="color: #000; margin: 5px 0 0 0; opacity: 0.8; font-size: 16px;">Bord Business Account</p>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                  <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Password Reset Request</h2>
                  
                  <p style="margin-bottom: 30px; font-size: 16px; color: #666; text-align: center;">
                    We received a request to reset your password for your Bord Business account. Click the button below to create a new password:
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background: #59d472; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                      Reset Password
                    </a>
                  </div>
                  
                  <p style="margin: 30px 0 10px 0; font-size: 14px; color: #666; text-align: center;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #999; word-break: break-all; text-align: center;">
                    ${resetUrl}
                  </p>
                  
                  <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px; margin-top: 30px;">
                    <p style="margin: 0; font-size: 14px; color: #1976d2;">
                      <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
                    </p>
                  </div>
                </div>
                
                <div style="text-align: center; color: #999; font-size: 12px;">
                  <p>This email was sent by Bord Business. If you have any questions, please contact our support team.</p>
                </div>
              </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
        // Don't expose email sending errors to prevent information leakage
      }
    }

    // Always return success response
    return NextResponse.json(
      {
        message:
          "If an account with that email exists, we've sent a password reset link.",
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
