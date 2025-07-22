// app/api/user/activate-profile/route.ts
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

    console.log("🔄 Activating user - Session info:", {
      userId: session.user.id,
      email: session.user.email,
      status: session.user.status,
    });

    // CRITICAL FIX: Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!existingUser) {
      console.error("❌ User not found in database:", {
        sessionUserId: session.user.id,
        sessionEmail: session.user.email,
      });

      return NextResponse.json(
        {
          message: "User record not found. Please sign in again.",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    console.log("✅ User found in database:", {
      userId: existingUser.id,
      email: existingUser.email,
      status: existingUser.status,
    });

    if (existingUser.status !== "PENDING") {
      return NextResponse.json(
        { message: "User is not in pending status" },
        { status: 400 }
      );
    }

    const { firstName, lastName, username, dateOfBirth, fullMobile } =
      await request.json();

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

    // Update user to ACTIVE status
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        username,
        phone: fullMobile,
        dateOfBirth: new Date(dateOfBirth),
        status: "ACTIVE",
        isVerified: true,
        isActive: true,
      },
    });

    console.log("✅ User activated successfully:", {
      userId: updatedUser.id,
      status: updatedUser.status,
      isActive: updatedUser.isActive,
    });

    return NextResponse.json({
      success: true,
      message: "Profile completed and account activated",
      shouldUpdateSession: true,
    });
  } catch (error) {
    console.error("❌ Activate user error:", error);

    // Better error handling for different Prisma errors
    if (error.code === "P2025") {
      return NextResponse.json(
        {
          message: "User record not found. Please sign in again.",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
