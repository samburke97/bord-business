import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    try {
      await prisma.$queryRaw`SELECT 1 as result`;
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Now try to fetch groups
    try {
      const groups = await prisma.group.findMany({
        select: {
          id: true,
          name: true,
          tagCount: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return NextResponse.json(groups);
    } catch (queryError) {
      console.error("Error querying groups table:", queryError);
      return NextResponse.json(
        { error: "Error querying groups table" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in GET /api/groups:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { name, tags } = body;

    // Validate request
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check for duplicate group names
    try {
      const existingGroup = await prisma.group.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

      if (existingGroup) {
        return NextResponse.json(
          { error: "A group with this name already exists." },
          { status: 409 }
        );
      }
    } catch (duplicateCheckError) {
      console.error("Error checking for duplicate group:", duplicateCheckError);
      return NextResponse.json(
        { error: "Error checking for existing group" },
        { status: 500 }
      );
    }

    // Use a transaction to ensure both the group and its associations are created atomically
    try {
      const newGroup = await prisma.$transaction(async (tx) => {
        // Create the group with the correct tagCount
        const tagCount = Array.isArray(tags) ? tags.length : 0;

        const group = await tx.group.create({
          data: {
            name,
            tagCount,
            lastEdited: new Date(),
          },
        });

        // Associate tags with the group if provided
        if (Array.isArray(tags) && tags.length > 0) {
          for (const tagId of tags) {
            await tx.groupTag.create({
              data: {
                groupId: group.id,
                tagId,
                lastSeeded: new Date(),
              },
            });
          }
        }

        return group;
      });

      return NextResponse.json(newGroup, { status: 201 });
    } catch (transactionError) {
      console.error("Error in group creation transaction:", transactionError);
      return NextResponse.json(
        {
          error: "Failed to create group",
          details: String(transactionError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in POST /api/groups:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
