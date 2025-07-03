// app/api/auth/check-user-status/route.ts
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        exists: false,
        isVerified: false,
        needsVerification: true,
      });
    }

    return NextResponse.json({
      exists: true,
      name: user.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
      needsVerification: !user.isVerified,
    });
  } catch (error) {
    console.error("User status check error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
