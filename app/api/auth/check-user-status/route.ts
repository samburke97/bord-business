// app/api/auth/check-user-status/route.ts - FIXED: Properly detect OAuth vs Email users
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

    // ✅ FIXED: Build the methods array properly - check for valid password hash
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

    // 🔍 DEBUG: Log what we found
    console.log("Check user status debug:", {
      email: user.email,
      hasCredentials: !!user.credentials,
      hasPasswordHash: !!user.credentials?.passwordHash,
      accountsCount: user.accounts.length,
      accounts: user.accounts.map((acc) => ({
        provider: acc.provider,
        type: acc.type,
      })),
      methods,
    });

    return NextResponse.json({
      exists: true,
      name: user.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
      needsVerification: !user.isVerified,

      // ✅ FIXED: Include the methods array that LoginForm expects
      methods: methods,

      // Keep other info for debugging/logging
      providers: user.accounts.map((acc) => acc.provider),
      hasCredentials: !!user.credentials,
      hasPasswordHash: !!user.credentials?.passwordHash,
    });
  } catch (error) {
    console.error("Check user status error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
