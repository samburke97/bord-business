import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GroupType } from "@prisma/client";

// Helper function to get the Facilities group
async function getFacilitiesGroup() {
  // Try to find a group with type FACILITY
  let facilitiesGroup = await prisma.group.findFirst({
    where: {
      type: GroupType.FACILITY,
    },
  });

  // If none exists, try to find a group named "Facilities"
  if (!facilitiesGroup) {
    facilitiesGroup = await prisma.group.findFirst({
      where: {
        name: { equals: "Facilities", mode: "insensitive" },
      },
    });

    // If found, update its type to FACILITY
    if (facilitiesGroup) {
      await prisma.group.update({
        where: { id: facilitiesGroup.id },
        data: { type: GroupType.FACILITY },
      });
    }
  }

  // If still no facilities group, create one
  if (!facilitiesGroup) {
    facilitiesGroup = await prisma.group.create({
      data: {
        name: "Facilities",
        type: GroupType.FACILITY,
      },
    });
  }

  return facilitiesGroup;
}

// GET: Fetch facility tags for a specific location
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const locationId = resolvedParams.id;

    // Get the facilities group
    const facilitiesGroup = await getFacilitiesGroup();

    // Get all tags that belong to the facilities group
    const facilityTags = await prisma.groupTag.findMany({
      where: {
        groupId: facilitiesGroup.id,
      },
      include: {
        tag: true,
      },
    });

    // Get existing facilities for this location
    const existingFacilities = await prisma.centerFacility.findMany({
      where: {
        centerId: locationId,
      },
      select: {
        tagId: true,
      },
    });

    const existingFacilityIds = new Set(existingFacilities.map((f) => f.tagId));

    // Extract the tag data from the relationships
    const facilities = facilityTags.map((groupTag) => ({
      id: groupTag.tag.id,
      name: groupTag.tag.name,
      imageUrl: groupTag.tag.imageUrl,
      isSelected: existingFacilityIds.has(groupTag.tag.id),
    }));

    return NextResponse.json(facilities);
  } catch (error) {
    console.error("Error fetching facility tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch facility tags" },
      { status: 500 }
    );
  }
}

// PUT: Update facilities for a location
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const locationId = resolvedParams.id;

    // Check if location exists
    const location = await prisma.center.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const { facilities } = await req.json();

    if (!Array.isArray(facilities)) {
      return NextResponse.json(
        { error: "Facilities must be an array of tag IDs" },
        { status: 400 }
      );
    }

    // Update facilities in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing facilities for this location
      await tx.centerFacility.deleteMany({
        where: {
          centerId: locationId,
        },
      });

      // 2. Add new facilities
      if (facilities.length > 0) {
        await Promise.all(
          facilities.map((tagId) =>
            tx.centerFacility.create({
              data: {
                centerId: locationId,
                tagId: tagId,
              },
            })
          )
        );
      }

      // 3. Update location's lastEdited timestamp
      await tx.center.update({
        where: { id: locationId },
        data: { lastEdited: new Date() },
      });
    });

    // Fetch updated facilities to return
    const updatedFacilityRelations = await prisma.centerFacility.findMany({
      where: {
        centerId: locationId,
      },
      include: {
        tag: true,
      },
    });

    const updatedFacilities = updatedFacilityRelations.map((relation) => ({
      id: relation.tag.id,
      name: relation.tag.name,
      imageUrl: relation.tag.imageUrl,
    }));

    return NextResponse.json(updatedFacilities);
  } catch (error) {
    console.error("Error updating facilities:", error);
    return NextResponse.json(
      { error: "Failed to update facilities" },
      { status: 500 }
    );
  }
}
