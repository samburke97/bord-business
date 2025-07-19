// app/api/user/activate-profile/route.ts - Activate PENDING user
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.id === "temp") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify user is in PENDING status
    if (session.user.status !== "PENDING") {
      return NextResponse.json(
        { message: "User is not in pending status" },
        { status: 400 }
      );
    }

    const { firstName, lastName, username, dateOfBirth, fullMobile } =
      await request.json();

    console.log("🔄 Activating PENDING user:", {
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
        NOT: { id: session.user.id },
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

    // Update user with complete profile and ACTIVE status
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        username,
        phone: fullMobile,
        dateOfBirth: new Date(dateOfBirth),
        status: "ACTIVE", // CRITICAL: Activate the user
        isVerified: true, // OAuth users are verified
        isActive: true,
      },
    });

    console.log("✅ User activated successfully:", {
      userId: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      status: updatedUser.status,
    });

    return NextResponse.json({
      success: true,
      message: "Profile completed and account activated",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        status: updatedUser.status,
        isVerified: updatedUser.isVerified,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error("❌ Activate user profile error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
