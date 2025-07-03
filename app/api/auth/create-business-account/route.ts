// app/api/auth/create-business-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      firstName,
      lastName,
      username,
      dateOfBirth,
      fullMobile,
      password,
    } = await request.json();

    // Validation
    if (
      !email ||
      !firstName ||
      !lastName ||
      !username ||
      !dateOfBirth ||
      !fullMobile ||
      !password
    ) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.isVerified) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create or update user
    const userData = {
      email,
      name: `${firstName} ${lastName}`,
      // If you have separate firstName/lastName fields, add them here
      phone: fullMobile,
      dateOfBirth: new Date(dateOfBirth),
      isVerified: true, // Since they just verified their email
      isActive: true,
      globalRole: "USER" as const,
    };

    let user;
    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { email },
        data: userData,
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: userData,
      });
    }

    // You might want to create a default business for the user
    // or handle business creation separately

    return NextResponse.json(
      {
        message: "Account created successfully",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Account creation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
