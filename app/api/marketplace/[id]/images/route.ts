import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch all images for a location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const centerId = resolvedParams.id;

    // Check if there are any images for debugging
    const count = await prisma.centerImage.count({
      where: { centerId },
    });

    // Get the images ordered by the order field if present, or id as fallback
    const images = await prisma.centerImage.findMany({
      where: { centerId },
      orderBy: [
        { order: "asc" },
        { id: "asc" }, // fallback ordering
      ],
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error("Error fetching location images:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch images",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// POST: Add a new image to a location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const centerId = resolvedParams.id;
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Find the highest order value to place the new image at the end
    const highestOrder = await prisma.centerImage.findFirst({
      where: { centerId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = highestOrder ? highestOrder.order + 1 : 1;

    // Create a new image record with the next order value
    const newImage = await prisma.centerImage.create({
      data: {
        centerId,
        imageUrl,
        order: nextOrder,
      },
    });

    return NextResponse.json(newImage, { status: 201 });
  } catch (error) {
    console.error("Error adding location image:", error);
    return NextResponse.json(
      {
        error: "Failed to add image",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
