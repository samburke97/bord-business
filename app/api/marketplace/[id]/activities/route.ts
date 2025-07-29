import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GroupType } from "@prisma/client";

// Helper function to get the Activities group
async function getActivitiesGroup() {
  // Try to find a group with type ACTIVITY
  let activitiesGroup = await prisma.group.findFirst({
    where: {
      type: GroupType.ACTIVITY,
    },
  });

  // If none exists, try to find a group named "Activities"
  if (!activitiesGroup) {
    activitiesGroup = await prisma.group.findFirst({
      where: {
        name: { equals: "Activities", mode: "insensitive" },
      },
    });

    // If found, update its type to ACTIVITY
    if (activitiesGroup) {
      await prisma.group.update({
        where: { id: activitiesGroup.id },
        data: { type: GroupType.ACTIVITY },
      });
    }
  }

  // If still no activities group, create one
  if (!activitiesGroup) {
    activitiesGroup = await prisma.group.create({
      data: {
        name: "Activities",
        type: GroupType.ACTIVITY,
      },
    });
  }

  return activitiesGroup;
}

// GET: Fetch activities for a specific location
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get search query parameters
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("query") || "";

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const locationId = resolvedParams.id;

    // Find activities for this location
    const centerActivities = await prisma.centerActivity.findMany({
      where: {
        centerId: locationId,
        activity: query
          ? {
              title: {
                contains: query,
                mode: "insensitive",
              },
            }
          : undefined,
      },
      include: {
        activity: {
          include: {
            activityType: true,
            pricingVariants: true,
          },
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    // Format the response - adapted for string-based pricing variants
    const activities = centerActivities.map((ca) => ({
      id: ca.activity.id,
      title: ca.activity.title,
      description: ca.activity.description,
      imageUrl: ca.activity.imageUrl,
      buttonTitle: ca.activity.buttonTitle,
      buttonLink: ca.activity.buttonLink,
      activityType: ca.activity.activityType,
      activityTypeId: ca.activity.activityTypeId,
      displayOrder: ca.displayOrder,
      pricingVariants: ca.activity.pricingVariants.map((pv) => ({
        id: pv.id,
        playerType: pv.playerType,
        duration: pv.duration,
        priceType: pv.priceType,
        price: pv.price,
      })),
    }));

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities for location:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// POST: Add an existing activity to a location
export async function POST(
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
    const { activityId, displayOrder = 0 } = await req.json();

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

    // Check if activity exists
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    // Check if relation already exists
    const existingRelation = await prisma.centerActivity.findUnique({
      where: {
        centerId_activityId: {
          centerId: locationId,
          activityId,
        },
      },
    });

    if (existingRelation) {
      return NextResponse.json(
        { error: "Activity already added to this location" },
        { status: 409 }
      );
    }

    // Create the relation
    const centerActivity = await prisma.centerActivity.create({
      data: {
        centerId: locationId,
        activityId,
        displayOrder,
      },
      include: {
        activity: {
          include: {
            activityType: true,
            pricingVariants: true, // Updated: no longer include relations
          },
        },
      },
    });

    return NextResponse.json({
      id: centerActivity.activity.id,
      title: centerActivity.activity.title,
      description: centerActivity.activity.description,
      imageUrl: centerActivity.activity.imageUrl,
      buttonTitle: centerActivity.activity.buttonTitle,
      buttonLink: centerActivity.activity.buttonLink,
      activityType: centerActivity.activity.activityType,
      activityTypeId: centerActivity.activity.activityTypeId,
      displayOrder: centerActivity.displayOrder,
      pricingVariants: centerActivity.activity.pricingVariants.map((pv) => ({
        id: pv.id,
        playerType: pv.playerType,
        duration: pv.duration,
        priceType: pv.priceType,
        price: pv.price,
      })),
    });
  } catch (error) {
    console.error("Error adding activity to location:", error);
    return NextResponse.json(
      { error: "Failed to add activity to location" },
      { status: 500 }
    );
  }
}

// PUT: Update the order or list of activities for a location
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
    const { activities } = await req.json();

    if (!Array.isArray(activities)) {
      return NextResponse.json(
        { error: "Activities must be an array" },
        { status: 400 }
      );
    }

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

    // Update activities in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing activity relations for this location
      await tx.centerActivity.deleteMany({
        where: {
          centerId: locationId,
        },
      });

      // 2. Add new activity relations with display order
      if (activities.length > 0) {
        await Promise.all(
          activities.map((activity, index) =>
            tx.centerActivity.create({
              data: {
                centerId: locationId,
                activityId: activity.id,
                displayOrder: activity.displayOrder || index,
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

    // Fetch updated activities to return
    const updatedCenterActivities = await prisma.centerActivity.findMany({
      where: {
        centerId: locationId,
      },
      include: {
        activity: {
          include: {
            activityType: true,
            pricingVariants: true,
          },
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    const updatedActivities = updatedCenterActivities.map((ca) => ({
      id: ca.activity.id,
      title: ca.activity.title,
      description: ca.activity.description,
      imageUrl: ca.activity.imageUrl,
      buttonTitle: ca.activity.buttonTitle,
      buttonLink: ca.activity.buttonLink,
      activityType: ca.activity.activityType,
      activityTypeId: ca.activity.activityTypeId,
      displayOrder: ca.displayOrder,
      pricingVariants: ca.activity.pricingVariants.map((pv) => ({
        id: pv.id,
        playerType: pv.playerType,
        duration: pv.duration,
        priceType: pv.priceType,
        price: pv.price,
      })),
    }));

    return NextResponse.json(updatedActivities);
  } catch (error) {
    console.error("Error updating activities for location:", error);
    return NextResponse.json(
      { error: "Failed to update activities" },
      { status: 500 }
    );
  }
}
