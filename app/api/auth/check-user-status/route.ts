// app/api/auth/check-user-status/route.ts - FIXED - Return proper methods array
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

    // FIXED: Build the methods array properly
    const methods: string[] = [];

    // Add email method if user has credentials (password)
    if (user.credentials) {
      methods.push("email");
    }

    // Add OAuth provider methods
    user.accounts.forEach((account) => {
      if (account.provider && !methods.includes(account.provider)) {
        methods.push(account.provider);
      }
    });

    console.log("🔍 User Status Check:", {
      email: normalizedEmail,
      exists: true,
      hasCredentials: !!user.credentials,
      oauthProviders: user.accounts.map((acc) => acc.provider),
      methods: methods,
    });

    return NextResponse.json({
      exists: true,
      name: user.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
      needsVerification: !user.isVerified,

      // FIXED: Include the methods array that LoginForm expects
      methods: methods,

      // Keep other info for debugging/logging
      providers: user.accounts.map((acc) => acc.provider),
      hasCredentials: !!user.credentials,
    });
  } catch (error) {
    console.error("❌ User status check error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
