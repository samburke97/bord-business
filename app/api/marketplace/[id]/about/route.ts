import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const center = await prisma.center.findUnique({
      where: { id },
      select: {
        description: true,
        highlights: true,
        logoUrl: true,
      },
    });

    if (!center) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(center);
  } catch (error) {
    console.error("Error fetching location about data:", error);
    return NextResponse.json(
      { error: "Failed to fetch location about data" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const data = await request.json();

    // Extract data from the request
    const { highlights, description, logoUrl } = data;

    // Validate center exists
    const existingCenter = await prisma.center.findUnique({
      where: { id },
    });

    if (!existingCenter) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Update center
    const updatedCenter = await prisma.center.update({
      where: { id },
      data: {
        description,
        highlights: highlights || [],
        logoUrl,
      },
    });

    return NextResponse.json(updatedCenter);
  } catch (error) {
    console.error("Error updating location about data:", error);
    return NextResponse.json(
      { error: "Failed to update location about data" },
      { status: 500 }
    );
  }
}
