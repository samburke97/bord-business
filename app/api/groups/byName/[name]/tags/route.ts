import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GroupType } from "@prisma/client";

// Helper function to ensure a group exists
async function ensureGroupExists(name: string, type: GroupType) {
  // Try to find a group with the given name
  let group = await prisma.group.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });

  // If the group exists but has a different type, update it
  if (group && group.type !== type) {
    group = await prisma.group.update({
      where: { id: group.id },
      data: { type },
    });
  }

  // If the group doesn't exist, create it
  if (!group) {
    group = await prisma.group.create({
      data: {
        name,
        type,
      },
    });
  }

  return group;
}

// Map group names to types
function getGroupType(name: string): GroupType {
  const normalizedName = name.toLowerCase();

  if (normalizedName === "activities") return GroupType.ACTIVITY;
  if (normalizedName === "sports") return GroupType.SPORT;
  if (normalizedName === "categories") return GroupType.CATEGORY;
  if (normalizedName === "facilities") return GroupType.FACILITY;

  return GroupType.GENERAL;
}

// GET: Fetch tags for a specific group by name
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await and resolve the params
    const resolvedParams = await params;
    const groupNameEncoded = resolvedParams.name;

    // Decode the group name
    const groupName = decodeURIComponent(groupNameEncoded);

    // Determine the expected group type
    const groupType = getGroupType(groupName);

    // Ensure the group exists
    const group = await ensureGroupExists(groupName, groupType);

    // Get all tags that belong to this group
    const groupTags = await prisma.groupTag.findMany({
      where: {
        groupId: group.id,
      },
      include: {
        tag: true,
      },
    });

    // Extract the tag data
    const tags = groupTags.map((groupTag) => ({
      id: groupTag.tag.id,
      name: groupTag.tag.name,
      imageUrl: groupTag.tag.imageUrl,
    }));

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags for group:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags for group" },
      { status: 500 }
    );
  }
}
