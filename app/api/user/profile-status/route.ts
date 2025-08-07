// app/api/user/profile-status/route.ts
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

    // 🔍 DEBUG: Log session data
    console.log("Session debug:", {
      userId: session.user.id,
      email: session.user.email,
      status: session.user.status,
    });

    // Check if user exists with detailed logging
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
      // 🔍 DEBUG: Try finding by email as fallback
      console.log("User not found by ID, trying email...");
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email || undefined },
        include: {
          credentials: true,
          accounts: true,
        },
      });

      if (userByEmail) {
        console.log("Found user by email:", {
          dbId: userByEmail.id,
          sessionId: session.user.id,
          status: userByEmail.status,
        });
        // Return the user data found by email
        const profileStatus = {
          hasPassword: !!userByEmail.credentials,
          firstName: userByEmail.firstName || null,
          lastName: userByEmail.lastName || null,
          phone: userByEmail.phone || null,
          dateOfBirth: userByEmail.dateOfBirth || null,
          isVerified: userByEmail.isVerified || false,
          isActive: userByEmail.isActive || false,
          status: userByEmail.status || null,
        };

        const isProfileComplete = !!(
          profileStatus.firstName &&
          profileStatus.lastName &&
          profileStatus.phone &&
          profileStatus.dateOfBirth
        );

        return NextResponse.json({
          ...profileStatus,
          isProfileComplete,
          oauthProviders: userByEmail.accounts.map((acc) => acc.provider),
          debug: {
            foundByEmail: true,
            sessionIdMismatch: true,
          },
        });
      }

      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user has password (email/password user vs OAuth user)
    const hasPassword = !!user.credentials;

    // Check profile completion fields
    const profileStatus = {
      hasPassword,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
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
    console.error("Profile status error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
