// app/api/auth/send-verification-code/route.ts - UPDATED WITH VERIFIED DOMAIN
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
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // For Bord Business, we always allow sending verification codes
    // This handles both new users and existing users who want to sign in
    // The verification step will determine the next action

    // Clean up any old verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        expires: {
          lt: new Date(),
        },
      },
    });

    // Generate secure 4-digit verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedCode = crypto
      .createHash("sha256")
      .update(verificationCode)
      .digest("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store verification token in database
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashedCode,
        expires,
      },
    });

    // Create user if they don't exist (unverified initially)
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email,
          isVerified: false,
          isActive: true,
        },
      });
    }

    // Customize email content based on user status
    const isNewUser = !existingUser;
    const emailSubject = isNewUser
      ? "Welcome to Bord Business - Verify Your Email"
      : "Sign in to Bord Business - Verification Required";

    const emailTitle = isNewUser
      ? "Welcome to Bord Business!"
      : "Sign in to Bord Business";

    const emailDescription = isNewUser
      ? "Let's verify your email address"
      : "Please verify your identity to continue";

    const emailInstructions = isNewUser
      ? "Enter this 4-digit code to verify your email and continue setting up your business account:"
      : "Enter this 4-digit code to sign in to your business account:";

    // Send verification email
    try {
      const emailResult = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@bordsports.com",
        to: email,
        subject: emailSubject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${emailSubject}</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #7ceb92 0%, #59d472 100%); border-radius: 12px;">
                <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: 600;">${emailTitle}</h1>
                <p style="color: #000; margin: 5px 0 0 0; opacity: 0.8; font-size: 16px;">${emailDescription}</p>
              </div>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Your Verification Code</h2>
                
                <p style="margin-bottom: 30px; font-size: 16px; color: #666; text-align: center;">
                  ${emailInstructions}
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
                  If you didn't ${isNewUser ? "create a Bord Business account" : "request this sign-in"}, please ignore this email or contact our support team.
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

      // Check if email failed due to any issues
      if (emailResult.error) {
        console.error("❌ Email sending error:", emailResult.error);
        throw new Error(emailResult.error.message || "Failed to send email");
      }

      return NextResponse.json(
        {
          message: "Verification code sent successfully",
          expiresIn: 600, // 10 minutes in seconds
          isNewUser,
        },
        { status: 200 }
      );
    } catch (emailError) {
      console.error("❌ Email sending error:", emailError);

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
    console.error("❌ Send verification code error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
