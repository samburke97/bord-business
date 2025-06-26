import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Define a type for pricing variants
interface PricingVariant {
  playerType: string;
  duration: string;
  priceType: string;
  price: number;
}

// GET - Fetch a specific activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Find the activity by ID
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        activityType: true,
        pricingVariants: true,
        centers: true,
      },
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

// PUT - Update a specific activity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const {
      title,
      description,
      activityTypeId,
      imageUrl,
      buttonTitle,
      buttonLink,
      locationId,
      pricingVariants,
    } = await request.json();

    // Check if activity exists
    const existingActivity = await prisma.activity.findUnique({
      where: { id },
      include: {
        pricingVariants: true,
      },
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    // If updating title and locationId is provided, check for duplicates
    if (title !== existingActivity.title && locationId) {
      const duplicateActivity = await prisma.activity.findFirst({
        where: {
          id: { not: id },
          title: {
            equals: title,
            mode: "insensitive",
          },
          centers: {
            some: {
              centerId: locationId,
            },
          },
        },
      });

      if (duplicateActivity) {
        return NextResponse.json(
          {
            error:
              "An activity with this title already exists for this location",
          },
          { status: 409 }
        );
      }
    }

    // Update the activity and pricing variants in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update the activity
      await tx.activity.update({
        where: { id },
        data: {
          title,
          description,
          activityTypeId,
          imageUrl,
          buttonTitle,
          buttonLink,
          lastEdited: new Date(),
        },
      });

      // 2. Handle pricing variants
      if (pricingVariants && pricingVariants.length > 0) {
        // Delete existing pricing variants
        await tx.activityPricing.deleteMany({
          where: { activityId: id },
        });

        // Create new pricing variants
        await Promise.all(
          pricingVariants.map((variant: PricingVariant) =>
            tx.activityPricing.create({
              data: {
                activityId: id,
                playerType: variant.playerType,
                duration: variant.duration,
                priceType: variant.priceType,
                price: typeof variant.price === "number" ? variant.price : 0,
              },
            })
          )
        );
      }
    });

    // Get the updated activity
    const updatedActivity = await prisma.activity.findUnique({
      where: { id },
      include: {
        activityType: true,
        pricingVariants: true,
      },
    });

    return NextResponse.json(updatedActivity);
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a specific activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Check if activity exists
    const activity = await prisma.activity.findUnique({
      where: { id },
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    // Delete the activity (pricing variants will be deleted cascading)
    await prisma.activity.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
