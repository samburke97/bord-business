// app/api/user/profile-status/route.ts - ENHANCED DEBUG VERSION
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // ✅ ENHANCED DEBUG: Check if user exists with detailed logging
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        credentials: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
            type: true,
          },
        },
      },
    });

    if (!user) {
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
      status: user.status || null,
    };

    // Determine if profile is complete
    const isProfileComplete = !!(
      profileStatus.firstName &&
      profileStatus.lastName &&
      profileStatus.username &&
      profileStatus.phone &&
      profileStatus.dateOfBirth
    );

    return NextResponse.json({
      ...profileStatus,
      isProfileComplete,
      // OAuth providers for reference
      oauthProviders: user.accounts.map((acc) => acc.provider),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
