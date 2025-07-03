// app/api/auth/check-username/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { message: "Username is required" },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3) {
      return NextResponse.json(
        { available: false, message: "Username must be at least 3 characters" },
        { status: 200 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        {
          available: false,
          message:
            "Username can only contain letters, numbers, and underscores",
        },
        { status: 200 }
      );
    }

    // Check if username exists in database
    const existingUser = await prisma.user.findFirst({
      where: {
        // Assuming you have a username field in your User model
        // You might need to add this field to your schema
        OR: [
          { name: username },
          // Add other username fields if they exist
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { available: false, message: "Username is already taken" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { available: true, message: "Username is available" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Username check error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
