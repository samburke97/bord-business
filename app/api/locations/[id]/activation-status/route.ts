import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    // Fetch location with all necessary relations to check requirements
    const location = await prisma.center.findUnique({
      where: { id },
      include: {
        establishment: true, // For category requirement
        images: true, // For gallery requirement
        links: true, // For website requirement
        sportCenters: {
          // For sport requirement
          include: {
            sport: true,
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Check each requirement and build a list of missing fields
    const missingFields: string[] = [];

    // 1. Name
    if (!location.name || location.name.trim() === "") {
      missingFields.push("Location name");
    }

    // 2. Address
    if (!location.address || location.address.trim() === "") {
      missingFields.push("Address");
    }

    // 3. Description
    if (!location.description || location.description.trim() === "") {
      missingFields.push("Description");
    }

    // 4. Category (establishment)
    if (!location.establishmentId) {
      missingFields.push("Category");
    }

    // 5. At least one sport
    if (!location.sportCenters || location.sportCenters.length === 0) {
      missingFields.push("At least one sport");
    }

    // 6. At least one gallery image
    if (!location.images || location.images.length === 0) {
      missingFields.push("At least one gallery image");
    }

    // 7. Website (from links)
    const hasWebsite = location.links?.some(
      (link) => link.type?.toLowerCase() === "website" && link.url
    );
    if (!hasWebsite) {
      missingFields.push("Website link");
    }

    // Determine if the location should be active based on requirements
    const shouldBeActive = missingFields.length === 0;

    // If the current active state doesn't match what it should be, update it
    if (location.isActive !== shouldBeActive) {
      await prisma.center.update({
        where: { id },
        data: { isActive: shouldBeActive },
      });
    }

    return NextResponse.json({
      id: location.id,
      isActive: shouldBeActive,
      missingFields: missingFields.length > 0 ? missingFields : null,
    });
  } catch (error) {
    console.error("Error checking activation status:", error);
    return NextResponse.json(
      {
        error: "Failed to check activation status",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
