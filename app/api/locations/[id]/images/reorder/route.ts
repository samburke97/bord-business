import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PUT: Update the order of images
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const centerId = resolvedParams.id;
    const { images } = await request.json();

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: "Invalid image data" },
        { status: 400 }
      );
    }

    const updates = [];

    for (const [index, image] of images.entries()) {
      updates.push(
        prisma.centerImage.update({
          where: { id: image.id },
          data: { order: index + 1 },
        })
      );
    }

    // Execute all updates in parallel
    const updatedImages = await Promise.all(updates);

    return NextResponse.json({
      message: "Image order updated successfully",
      orderedImages: updatedImages.map((img) => ({
        id: img.id,
        order: img.order,
      })),
    });
  } catch (error) {
    console.error("Error updating image order:", error);
    return NextResponse.json(
      {
        error: "Failed to update image order",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
