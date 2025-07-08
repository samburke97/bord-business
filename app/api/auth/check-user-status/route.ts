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

    return NextResponse.json({
      exists: true,
      name: user.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
      needsVerification: !user.isVerified,
      // Include provider info to help frontend decide routing/error
      providers: user.accounts.map((acc) => acc.provider),
      hasCredentials: !!user.credentials,
    });
  } catch (error) {
    console.error("User status check error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
