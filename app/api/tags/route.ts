import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/tags - Fetch all tags
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all tags with their group count
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            groups: true,
          },
        },
      },
    });

    // Transform the data to include groupCount
    const formattedTags = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      imageUrl: tag.imageUrl,
      groupCount: tag._count.groups,
    }));

    return NextResponse.json(formattedTags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create a new tag
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, imageUrl, groups } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    // Check if tag with the same name exists
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive", // Case insensitive
        },
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }

    // Create the tag using Prisma transaction
    const newTag = await prisma.$transaction(async (tx) => {
      // Create the tag
      const tag = await tx.tag.create({
        data: {
          name,
          imageUrl,
          lastEdited: new Date(),
        },
      });

      // If groups are provided, create group associations
      if (groups && groups.length > 0) {
        await Promise.all(
          groups.map((groupId: string) =>
            tx.groupTag.create({
              data: {
                groupId,
                tagId: tag.id,
              },
            })
          )
        );
      }

      return tag;
    });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
