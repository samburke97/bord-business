import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// DELETE: Remove an image from a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: centerId, imageId } = resolvedParams;

    // Verify the image exists and belongs to the specified center
    const image = await prisma.centerImage.findFirst({
      where: {
        id: imageId,
        centerId,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete the image
    await prisma.centerImage.delete({
      where: { id: imageId },
    });

    // Re-order the remaining images
    const remainingImages = await prisma.centerImage.findMany({
      where: { centerId },
      orderBy: { order: "asc" },
    });

    // Update order for remaining images
    for (let i = 0; i < remainingImages.length; i++) {
      await prisma.centerImage.update({
        where: { id: remainingImages[i].id },
        data: { order: i + 1 },
      });
    }

    return NextResponse.json({
      message: "Image deleted successfully",
      reordered: remainingImages.length,
    });
  } catch (error) {
    console.error("Error deleting location image:", error);
    return NextResponse.json(
      {
        error: "Failed to delete image",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
