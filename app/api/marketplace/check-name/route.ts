// app/api/locations/check-name/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Name parameter is required" },
        { status: 400 }
      );
    }

    // Check if a location with this name already exists (case insensitive)
    const existingLocation = await prisma.center.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive", // Case insensitive comparison
        },
      },
    });

    // Always include the full response for better debugging
    return NextResponse.json({
      exists: !!existingLocation,
      checked: name,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking location name:", error);
    return NextResponse.json(
      { error: "Failed to check location name" },
      { status: 500 }
    );
  }
}
