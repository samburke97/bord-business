// app/api/groups/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GroupType } from "@prisma/client";

// Helper function to get the Categories group
async function getCategoriesGroup() {
  // Try to find a group with type CATEGORY
  let categoriesGroup = await prisma.group.findFirst({
    where: {
      type: GroupType.CATEGORY,
    },
  });

  // If none exists, try to find a group named "Categories"
  if (!categoriesGroup) {
    categoriesGroup = await prisma.group.findFirst({
      where: {
        name: { equals: "Categories", mode: "insensitive" },
      },
    });

    // If found, update its type to CATEGORY
    if (categoriesGroup) {
      await prisma.group.update({
        where: { id: categoriesGroup.id },
        data: { type: GroupType.CATEGORY },
      });
    }
  }

  // If still no categories group, create one
  if (!categoriesGroup) {
    categoriesGroup = await prisma.group.create({
      data: {
        name: "Categories",
        type: GroupType.CATEGORY,
      },
    });
  }

  return categoriesGroup;
}

// GET: Fetch category tags
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the categories group
    const categoriesGroup = await getCategoriesGroup();

    // Get all tags that belong to the categories group
    const categoryTags = await prisma.groupTag.findMany({
      where: {
        groupId: categoriesGroup.id,
      },
      include: {
        tag: true,
      },
    });

    // Extract the tag data from the relationships
    const categories = categoryTags.map((groupTag) => ({
      id: groupTag.tag.id,
      name: groupTag.tag.name,
      imageUrl: groupTag.tag.imageUrl,
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching category tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch category tags" },
      { status: 500 }
    );
  }
}
