import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { address, latitude, longitude } = await request.json();

    // Update the center address and coordinates
    const updatedCenter = await prisma.center.update({
      where: { id },
      data: {
        address,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null,
      },
    });

    return NextResponse.json(
      { message: "Location address updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating location address:", error);
    return NextResponse.json(
      {
        error: "Failed to update location address",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
