// app/api/user/profile-status/route.ts - MISSING ENDPOINT
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("❌ Profile Status API: No valid session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 Profile Status API: Checking profile for user:", {
      userId: session.user.id,
      email: session.user.email,
    });

    // Get user with credentials info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        credentials: true,
        accounts: true,
      },
    });

    if (!user) {
      console.log("❌ Profile Status API: User not found");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user has password (email/password user vs OAuth user)
    const hasPassword = !!user.credentials;

    // Check profile completion fields
    const profileStatus = {
      hasPassword,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      username: user.username || null,
      phone: user.phone || null,
      dateOfBirth: user.dateOfBirth || null,
      isVerified: user.isVerified || false,
      isActive: user.isActive || false,
    };

    // Determine if profile is complete
    const isProfileComplete = !!(
      profileStatus.firstName &&
      profileStatus.lastName &&
      profileStatus.username &&
      profileStatus.phone &&
      profileStatus.dateOfBirth
    );

    console.log("📊 Profile Status API: User profile analysis:", {
      userId: user.id,
      email: user.email,
      hasPassword,
      isProfileComplete,
      missingFields: {
        firstName: !profileStatus.firstName,
        lastName: !profileStatus.lastName,
        username: !profileStatus.username,
        phone: !profileStatus.phone,
        dateOfBirth: !profileStatus.dateOfBirth,
      },
    });

    return NextResponse.json({
      ...profileStatus,
      isProfileComplete,
      // OAuth providers for reference
      oauthProviders: user.accounts.map((acc) => acc.provider),
    });
  } catch (error) {
    console.error("❌ Profile Status API error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
