// app/api/groups/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!group) {
      return new NextResponse(JSON.stringify({ error: "Group not found" }), {
        status: 404,
      });
    }

    // Transform to a more friendly format for the frontend
    const formattedGroup = {
      id: group.id,
      name: group.name,
      tagCount: group.tagCount,
      tags: group.tags.map((tag) => ({
        id: tag.tag.id,
        name: tag.tag.name,
      })),
    };

    return NextResponse.json(formattedGroup);
  } catch (error) {
    console.error("Error fetching group:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const body = await request.json();
    const { name, tags } = body;

    if (!name || typeof name !== "string") {
      return new NextResponse(JSON.stringify({ error: "Name is required" }), {
        status: 400,
      });
    }

    // Check if another group already has this name
    const existingGroup = await prisma.group.findFirst({
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

    if (existingGroup) {
      return new NextResponse(
        JSON.stringify({ error: "A group with this name already exists" }),
        { status: 409 }
      );
    }

    // Start a transaction for updating both the group and its tags
    const updatedGroup = await prisma.$transaction(async (tx) => {
      // First, update the group itself
      const group = await tx.group.update({
        where: { id },
        data: {
          name,
          lastEdited: new Date(),
          // If tags array is provided, update the tagCount
          ...(tags && { tagCount: tags.length }),
        },
      });

      // If tags array is provided, update the group's tags
      if (tags && Array.isArray(tags)) {
        // First, remove all current tag associations
        await tx.groupTag.deleteMany({
          where: { groupId: id },
        });

        // Then add the new tag associations
        for (const tagId of tags) {
          await tx.groupTag.create({
            data: {
              groupId: id,
              tagId,
              lastSeeded: new Date(),
            },
          });
        }
      }

      return group;
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating group:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      return new NextResponse(JSON.stringify({ error: "Group not found" }), {
        status: 404,
      });
    }

    // Delete the group - cascade will handle related records
    await prisma.group.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting group:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
