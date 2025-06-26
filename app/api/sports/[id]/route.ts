import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/sports/[id] - Get a specific sport
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const sport = await prisma.sport.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        centers: {
          include: {
            center: true,
          },
        },
      },
    });

    if (!sport) {
      return NextResponse.json({ error: "Sport not found" }, { status: 404 });
    }

    // Transform the data to be more user-friendly
    const transformedSport = {
      ...sport,
      tags: sport.tags.map((sportTag) => sportTag.tag),
      centers: sport.centers.map((sportCenter) => sportCenter.center),
    };

    return NextResponse.json(transformedSport);
  } catch (error) {
    console.error("Error fetching sport:", error);
    return NextResponse.json(
      { error: "Failed to fetch sport" },
      { status: 500 }
    );
  }
}

// PUT /api/sports/[id] - Update a sport
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { name, imageUrl, tags = [] } = body;

    // Check if name is provided
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Sport name is required" },
        { status: 400 }
      );
    }

    // Check if a sport with the same name already exists (excluding the current sport)
    const existingSport = await prisma.sport.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        id: {
          not: id,
        },
      },
    });

    if (existingSport) {
      return NextResponse.json(
        { error: "A sport with this name already exists" },
        { status: 409 }
      );
    }

    // First, check if the sport exists
    const sport = await prisma.sport.findUnique({
      where: {
        id,
      },
    });

    if (!sport) {
      return NextResponse.json({ error: "Sport not found" }, { status: 404 });
    }

    // Update the sport with transaction
    const updatedSport = await prisma.$transaction(async (tx) => {
      // Delete existing tag connections
      await tx.sportTag.deleteMany({
        where: {
          sportId: id,
        },
      });

      // Update the sport
      const updated = await tx.sport.update({
        where: {
          id,
        },
        data: {
          name,
          imageUrl,
          tagCount: tags.length,
          lastEdited: new Date(),
        },
      });

      // Recreate tag connections
      if (tags.length > 0) {
        const tagConnections = tags.map((tagId: string) => ({
          sportId: id,
          tagId,
        }));

        await tx.sportTag.createMany({
          data: tagConnections,
        });
      }

      return updated;
    });

    return NextResponse.json(updatedSport);
  } catch (error) {
    console.error("Error updating sport:", error);
    return NextResponse.json(
      { error: "Failed to update sport" },
      { status: 500 }
    );
  }
}

// DELETE /api/sports/[id] - Delete a sport
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Check if the sport exists
    const sport = await prisma.sport.findUnique({
      where: {
        id,
      },
    });

    if (!sport) {
      return NextResponse.json({ error: "Sport not found" }, { status: 404 });
    }

    // Delete the sport (cascades to relations because of onDelete: Cascade)
    await prisma.sport.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: "Sport deleted successfully" });
  } catch (error) {
    console.error("Error deleting sport:", error);
    return NextResponse.json(
      { error: "Failed to delete sport" },
      { status: 500 }
    );
  }
}
