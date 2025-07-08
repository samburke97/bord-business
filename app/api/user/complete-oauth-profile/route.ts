// app/api/user/complete-oauth-profile/route.ts - COMPLETE OAUTH USER PROFILE
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { firstName, lastName, username, dateOfBirth, fullMobile } =
      await request.json();

    console.log("🔄 Completing OAuth user profile:", {
      userId: session.user.id,
      email: session.user.email,
      firstName,
      lastName,
      username,
    });

    // Validate required fields
    if (!firstName || !lastName || !username || !dateOfBirth || !fullMobile) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate username uniqueness
    const existingUsername = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: session.user.id }, // Exclude current user
      },
    });

    if (existingUsername) {
      return NextResponse.json(
        { message: "Username is already taken" },
        { status: 400 }
      );
    }

    // Validate date of birth
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    if (age < 16) {
      return NextResponse.json(
        { message: "You must be at least 16 years old" },
        { status: 400 }
      );
    }

    if (age > 120) {
      return NextResponse.json(
        { message: "Please enter a valid date of birth" },
        { status: 400 }
      );
    }

    // Validate phone number
    if (!/^\+?[\d\s\-\(\)]{10,}$/.test(fullMobile.trim())) {
      return NextResponse.json(
        { message: "Please enter a valid phone number" },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        username,
        phone: fullMobile,
        dateOfBirth: new Date(dateOfBirth),
        // Mark as verified for OAuth users (they verified via OAuth provider)
        isVerified: true,
        isActive: true,
      },
    });

    console.log("✅ OAuth user profile completed successfully:", {
      userId: updatedUser.id,
      name: updatedUser.name,
      username: updatedUser.username,
      isVerified: updatedUser.isVerified,
    });

    return NextResponse.json({
      success: true,
      message: "Profile completed successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        isVerified: updatedUser.isVerified,
      },
    });
  } catch (error) {
    console.error("❌ Complete OAuth profile error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
