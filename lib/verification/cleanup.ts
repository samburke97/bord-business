// lib/verification/automated-cleanup.ts - SIMPLE AUTOMATED CLEANUP
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

// Clean up expired verification tokens
async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await prisma.verificationToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  } catch (error) {
    return 0;
  }
}

// Clean up unverified users after 7 days
async function cleanupUnverifiedUsers(): Promise<number> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find users to delete first for logging
    const usersToDelete = await prisma.user.findMany({
      where: {
        isVerified: false,
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (usersToDelete.length === 0) {
      return 0;
    }

    // Delete in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete related verification tokens first
      await tx.verificationToken.deleteMany({
        where: {
          identifier: {
            in: usersToDelete.map((u) => u.email),
          },
        },
      });

      // Delete users
      const deleteResult = await tx.user.deleteMany({
        where: {
          id: {
            in: usersToDelete.map((u) => u.id),
          },
        },
      });

      return deleteResult.count;
    });

    return result;
  } catch (error) {
    return 0;
  }
}

// Send 24-hour verification reminders
async function sendVerificationReminders(): Promise<number> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Find users who need reminders
    const usersNeedingReminder = await prisma.user.findMany({
      where: {
        isVerified: false,
        createdAt: {
          lt: twentyFourHoursAgo,
          gt: fortyEightHoursAgo, // Don't spam - only users 24-48 hours old
        },
        OR: [
          { reminderSentAt: null },
          { reminderSentAt: { lt: fortyEightHoursAgo } }, // Max one reminder per 48 hours
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        createdAt: true,
      },
    });

    if (usersNeedingReminder.length === 0) {
      return 0;
    }

    let remindersSent = 0;

    for (const user of usersNeedingReminder) {
      try {
        // Generate new verification code
        const verificationCode = Math.floor(
          1000 + Math.random() * 9000
        ).toString();
        const hashedCode = crypto
          .createHash("sha256")
          .update(verificationCode)
          .digest("hex");
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store new verification token
        await prisma.verificationToken.upsert({
          where: {
            identifier_token: {
              identifier: user.email,
              token: hashedCode,
            },
          },
          create: {
            identifier: user.email,
            token: hashedCode,
            expires,
          },
          update: {
            token: hashedCode,
            expires,
          },
        });

        // Send reminder email with 7-day deletion warning
        await resend.emails.send({
          from: process.env.FROM_EMAIL || "onboarding@bordsports.com",
          to: user.email,
          subject: "⚠️ Verify your account - Will be deleted in 7 days",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Account Verification Required</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 40px;">
                  <img src="https://your-domain.com/logo.png" alt="Bord Business" style="height: 40px;">
                </div>
                
                <h1 style="color: #dc3545; text-align: center; margin-bottom: 30px;">
                  ⚠️ Action Required: Verify Your Account
                </h1>
                
                <p style="color: #34495e; font-size: 16px;">
                  Hi ${user.firstName || user.name || "there"},
                </p>
                
                <p style="color: #34495e; font-size: 16px;">
                  Your Bord Business account was created 24 hours ago but hasn't been verified yet.
                </p>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 30px 0;">
                  <p style="color: #856404; margin: 0; font-size: 16px; font-weight: bold; text-align: center;">
                    ⏰ Your account will be automatically deleted in 7 days if not verified
                  </p>
                </div>
                
                <p style="color: #34495e; font-size: 16px;">
                  Please verify your account now to avoid losing access:
                </p>
                
                <div style="background-color: #f8f9fa; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0;">
                  <p style="color: #2c3e50; font-size: 18px; text-align: center; margin: 0;">
                    Your verification code:
                  </p>
                  <p style="font-size: 32px; font-weight: bold; text-align: center; color: #10b981; margin: 15px 0; letter-spacing: 4px; font-family: monospace;">
                    ${verificationCode}
                  </p>
                  <p style="color: #6c757d; font-size: 14px; text-align: center; margin: 0;">
                    This code expires in 10 minutes
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXTAUTH_URL}/verify-email?email=${encodeURIComponent(user.email)}" 
                     style="display: inline-block; background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Verify My Account Now
                  </a>
                </div>
                
                <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 30px 0;">
                  <p style="color: #721c24; margin: 0; font-size: 14px; text-align: center;">
                    <strong>Important:</strong> Unverified accounts are permanently deleted after 7 days for security reasons.
                  </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #6c757d; font-size: 12px; text-align: center; margin: 0;">
                  Having trouble? Reply to this email for support.<br>
                  © ${new Date().getFullYear()} Bord Sports Ltd. All rights reserved.
                </p>
              </body>
            </html>
          `,
        });

        // Update user's reminderSentAt timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { reminderSentAt: new Date() },
        });

        remindersSent++;

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {}
    }

    return remindersSent;
  } catch (error) {
    return 0;
  }
}

// Main automated cleanup function
export async function runAutomatedCleanup(): Promise<void> {
  const startTime = Date.now();

  try {
    // Run all cleanup tasks
    const [expiredTokens, remindersSent, deletedUsers] = await Promise.all([
      cleanupExpiredTokens(),
      sendVerificationReminders(),
      cleanupUnverifiedUsers(),
    ]);

    const duration = Date.now() - startTime;
  } catch (error) {}
}
