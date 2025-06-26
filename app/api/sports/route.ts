import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/sports - Fetch all sports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "";

    const sports = await prisma.sport.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(sports);
  } catch (error) {
    console.error("Error fetching sports:", error);
    return NextResponse.json(
      { error: "Failed to fetch sports" },
      { status: 500 }
    );
  }
}

// POST /api/sports - Create a new sport
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, imageUrl, tags = [] } = body;

    // Check if name is provided
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Sport name is required" },
        { status: 400 }
      );
    }

    // Check if a sport with the same name already exists
    const existingSport = await prisma.sport.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingSport) {
      return NextResponse.json(
        { error: "A sport with this name already exists" },
        { status: 409 }
      );
    }

    // Create the sport with transaction to handle tag connections
    const sport = await prisma.$transaction(async (tx) => {
      // Create the sport
      const newSport = await tx.sport.create({
        data: {
          name,
          imageUrl,
          tagCount: tags.length,
        },
      });

      // Connect tags if provided
      if (tags.length > 0) {
        const tagConnections = tags.map((tagId: string) => ({
          sportId: newSport.id,
          tagId,
        }));

        await tx.sportTag.createMany({
          data: tagConnections,
        });
      }

      return newSport;
    });

    return NextResponse.json(sport, { status: 201 });
  } catch (error) {
    console.error("Error creating sport:", error);
    return NextResponse.json(
      { error: "Failed to create sport" },
      { status: 500 }
    );
  }
}
