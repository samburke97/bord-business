import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists with related accounts and credentials
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        accounts: true,
        credentials: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        exists: false,
        isVerified: false,
        needsVerification: true,
      });
    }

    // ✅ SECURITY FIX: Build methods array without revealing internal details
    const methods: string[] = [];

    // Add email method ONLY if user has credentials AND a valid password hash
    if (user.credentials && user.credentials.passwordHash) {
      methods.push("email");
    }

    // Add OAuth provider methods
    user.accounts.forEach((account) => {
      if (account.provider && !methods.includes(account.provider)) {
        methods.push(account.provider);
      }
    });

    // ✅ FIXED: Minimal response - only return what's needed
    return NextResponse.json({
      exists: true,
      name: user.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
      needsVerification: !user.isVerified,
      methods: methods, // Keep this - LoginForm needs it
    });
  } catch (error) {
    console.error("Check user status error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
