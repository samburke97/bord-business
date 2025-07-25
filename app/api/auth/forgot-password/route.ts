// app/api/auth/forgot-password/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import {
  generateSecureToken,
  hashToken,
  constantTimeDelay,
  sanitizeEmail,
  validateEmail,
} from "@/lib/security/password";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { email } = body;

    // Input validation
    if (!email) {
      await constantTimeDelay();
      return NextResponse.json(
        { message: "Email is required" },
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

    // Get client info for logging
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    try {
      // Check if user exists (timing-safe approach)
      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
        include: {
          credentials: true,
        },
      });

      // ALWAYS return success to prevent email enumeration attacks
      // But only send email if user actually exists and has credentials
      if (user && user.credentials) {
        await prisma.$transaction(async (tx) => {
          // Clean up any old password reset tokens for this user
          await tx.passwordResetToken.deleteMany({
            where: {
              email: sanitizedEmail,
              expires: {
                lt: new Date(),
              },
            },
          });

          // Check for recent reset attempts (rate limiting)
          const recentTokens = await tx.passwordResetToken.findMany({
            where: {
              email: sanitizedEmail,
              createdAt: {
                gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
              },
            },
          });

          // Allow max 3 reset attempts per hour
          if (recentTokens.length >= 3) {
            // Log suspicious activity but still return success
            await tx.securityEvent.create({
              data: {
                credentialsId: user.credentials.id,
                eventType: "SUSPICIOUS_ACTIVITY",
                description: "Excessive password reset attempts",
                ipAddress: clientIP,
                userAgent: userAgent,
              },
            });
            return; // Don't send email but don't reveal this to user
          }

          // Generate secure reset token
          const resetToken = generateSecureToken(32);
          const hashedToken = hashToken(resetToken); // FIXED: Now using sync version
          const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

          // Store reset token in database
          await tx.passwordResetToken.create({
            data: {
              email: sanitizedEmail,
              token: hashedToken,
              expires,
              ipAddress: clientIP,
              userAgent: userAgent,
            },
          });

          // Log security event
          await tx.securityEvent.create({
            data: {
              credentialsId: user.credentials.id,
              eventType: "PASSWORD_RESET_REQUESTED",
              description: "Password reset requested via email",
              ipAddress: clientIP,
              userAgent: userAgent,
            },
          });

          // Create reset URL
          const resetUrl = `${process.env.NEXTAUTH_URL}/password/reset?token=${resetToken}&email=${encodeURIComponent(sanitizedEmail)}`;

          // Send password reset email
          try {
            const emailResult = await resend.emails.send({
              from: process.env.FROM_EMAIL || "noreply@resend.dev",
              to: sanitizedEmail,
              subject: "🔐 Reset Your Bord Business Password",
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
                      <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: 600;">🔐 Reset Your Password</h1>
                      <p style="color: #000; margin: 5px 0 0 0; opacity: 0.8; font-size: 16px;">Bord Business Account</p>
                    </div>
                    
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                      <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Password Reset Request</h2>
                      
                      <p style="margin-bottom: 30px; font-size: 16px; color: #666; text-align: center;">
                        We received a request to reset your password for your Bord Business account.
                        Click the button below to create a new password:
                      </p>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: #59d472; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 8px rgba(89, 212, 114, 0.3);">
                          Reset Password Securely
                        </a>
                      </div>
                      
                      <p style="margin: 30px 0 10px 0; font-size: 14px; color: #666; text-align: center;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #999; word-break: break-all; text-align: center; background: #f0f0f0; padding: 10px; border-radius: 4px;">
                        ${resetUrl}
                      </p>
                      
                      <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; border-radius: 4px; margin-top: 30px;">
                        <p style="margin: 0; font-size: 14px; color: #1976d2;">
                          <strong>🛡️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and consider changing your password as a precaution.
                        </p>
                      </div>

                      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin-top: 15px;">
                        <p style="margin: 0; font-size: 14px; color: #856404;">
                          <strong>⚠️ Important:</strong> For your security, this request was made from IP: ${clientIP}. If this wasn't you, please contact support immediately.
                        </p>
                      </div>
                    </div>
                    
                    <div style="text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
                      <p>This email was sent by Bord Business Security System.</p>
                      <p>For support, please contact: support@bord.co</p>
                      <p style="margin-top: 15px; font-size: 11px;">
                        Request ID: ${resetToken.substring(0, 8)} | Time: ${new Date().toISOString()}
                      </p>
                    </div>
                  </body>
                </html>
              `,
              // Text fallback for email clients that don't support HTML
              text: `
Security Alert: Password Reset Request

We received a request to reset your password for your Bord Business account.

Reset your password by visiting this link:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

For security, this request was made from IP: ${clientIP}

Need help? Contact: support@bord.co
Request ID: ${resetToken.substring(0, 8)}
              `.trim(),
            });
          } catch (emailError) {
            // Log email failure but don't expose to user
            await tx.securityEvent.create({
              data: {
                credentialsId: user.credentials.id,
                eventType: "SUSPICIOUS_ACTIVITY",
                description: "Password reset email failed to send",
                ipAddress: clientIP,
                userAgent: userAgent,
                metadata: {
                  error:
                    emailError instanceof Error
                      ? emailError.message
                      : "Unknown error",
                  resendApiKey: process.env.RESEND_API_KEY
                    ? "Present"
                    : "Missing",
                  fromEmail: process.env.FROM_EMAIL || "onboarding@resend.dev",
                },
              },
            });
          }
        });
      } else {
        // User doesn't exist but still consume time to prevent enumeration
        await constantTimeDelay(200, 400);
      }

      // Ensure minimum response time for all cases
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 300) {
        await new Promise((resolve) => setTimeout(resolve, 300 - elapsedTime));
      }

      // Always return success response to prevent email enumeration
      return NextResponse.json(
        {
          message:
            "If an account with that email exists, we've sent a password reset link.",
          success: true,
        },
        { status: 200 }
      );
    } catch (dbError) {
      await constantTimeDelay(200, 400);

      return NextResponse.json(
        {
          message:
            "If an account with that email exists, we've sent a password reset link.",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    // Ensure minimum response time
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime < 300) {
      await new Promise((resolve) => setTimeout(resolve, 300 - elapsedTime));
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
