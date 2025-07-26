// app/api/auth/create-verified-session/route.ts - ORIGINAL VERSION RESTORED
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
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

    // Find the verified user
    const user = await prisma.user.findUnique({
      where: {
        email,
        isVerified: true, // Only allow verified users
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found or not verified" },
        { status: 404 }
      );
    }

    // Create a NextAuth JWT token
    const token = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
        isVerified: user.isVerified,
        isActive: user.isActive,
        status: user.status,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set the session cookie
    const cookieStore = cookies();
    cookieStore.set("next-auth.session-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Session created successfully",
    });
  } catch (error) {
    console.error("Create verified session error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
