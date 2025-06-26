import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET handler for fetching details data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Fetch ALL SportCenter records for this center
    const sportCenters = await prisma.sportCenter.findMany({
      where: { centerId: id },
      include: {
        sport: true,
      },
    });

    // Fetch center with establishment
    const center = await prisma.center.findUnique({
      where: { id },
      include: {
        establishment: true,
      },
    });

    if (!center) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Format the sports data
    const sports = sportCenters.map((sc) => ({
      id: sc.sport.id,
      name: sc.sport.name,
      imageUrl: sc.sport.imageUrl,
    }));

    return NextResponse.json({
      id: center.id,
      name: center.name,
      establishment: center.establishment?.name || null,
      establishmentId: center.establishmentId || null,
      sports: sports,
    });
  } catch (error) {
    console.error("Error fetching location details:", error);
    return NextResponse.json(
      { error: "Failed to fetch location details" },
      { status: 500 }
    );
  }
}

// PUT handler for updating details data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { name, establishmentId, sportsIds } = await request.json();

    // Validate sports exist
    const validSports = await prisma.sport.findMany({
      where: { id: { in: sportsIds } },
      select: { id: true },
    });

    // Check for invalid sports
    const invalidSports = sportsIds.filter(
      (sportId: string) => !validSports.some((sport) => sport.id === sportId)
    );

    if (invalidSports.length > 0) {
      console.error("Invalid sport IDs:", invalidSports);
      return NextResponse.json(
        { error: "Invalid sport IDs", invalidSports },
        { status: 400 }
      );
    }

    // Transaction to update center and sports associations
    const result = await prisma.$transaction(async (tx) => {
      // Remove existing sport associations
      const deletionResult = await tx.sportCenter.deleteMany({
        where: { centerId: id },
      });

      // Create new sport associations
      if (sportsIds && sportsIds.length > 0) {
        const creationResult = await tx.sportCenter.createMany({
          data: sportsIds.map((sportId: string) => ({
            centerId: id,
            sportId,
          })),
          skipDuplicates: true,
        });

        // Verify associations
        const verifyAssociations = await tx.sportCenter.findMany({
          where: { centerId: id },
        });
      }

      // Update center details
      const updatedCenter = await tx.center.update({
        where: { id },
        data: {
          name: name || undefined,
          establishmentId: establishmentId || null,
          lastEdited: new Date(),
        },
      });

      // Update sport's center count
      await Promise.all(
        sportsIds.map(async (sportId: string) => {
          const centerCount = await tx.sportCenter.count({
            where: { sportId },
          });

          await tx.sport.update({
            where: { id: sportId },
            data: { centerCount },
          });
        })
      );

      return updatedCenter;
    });

    // Fetch updated center with sports to confirm
    const updatedCenterWithSports = await prisma.sportCenter.findMany({
      where: { centerId: id },
      include: {
        sport: true,
      },
    });

    return NextResponse.json({
      message: "Details updated successfully",
      center: {
        id: id,
        name: result.name,
        sports: updatedCenterWithSports.map((sc) => ({
          id: sc.sport.id,
          name: sc.sport.name,
          imageUrl: sc.sport.imageUrl,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to update location details",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
