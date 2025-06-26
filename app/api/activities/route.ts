import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Define a type for pricing variants
interface PricingVariant {
  playerType: string;
  duration?: string | null;
  priceType: string;
  price: number;
}

// GET - List all activities
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "";
    const take = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Find all activities matching query
    const activities = await prisma.activity.findMany({
      where: {
        title: query
          ? {
              contains: query,
              mode: "insensitive",
            }
          : undefined,
      },
      include: {
        activityType: true,
        pricingVariants: true,
      },
      take,
      skip: offset,
      orderBy: {
        title: "asc",
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// POST - Create a new activity
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Check if an activity with this title already exists in this location
    if (locationId) {
      const existingActivity = await prisma.activity.findFirst({
        where: {
          title: {
            equals: title,
            mode: "insensitive", // Case-insensitive search
          },
          centers: {
            some: {
              centerId: locationId,
            },
          },
        },
      });

      if (existingActivity) {
        return NextResponse.json(
          {
            error:
              "An activity with this title already exists for this location",
          },
          { status: 409 }
        );
      }
    }

    // Create the activity and pricing variants in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the activity
      const activity = await tx.activity.create({
        data: {
          title,
          description,
          imageUrl,
          buttonTitle,
          buttonLink,
          activityTypeId,
          ...(locationId
            ? {
                centers: {
                  create: {
                    centerId: locationId,
                    displayOrder: 0, // Default display order
                  },
                },
              }
            : {}),
        },
      });

      // 2. Create the pricing variants with string fields
      if (pricingVariants && pricingVariants.length > 0) {
        await Promise.all(
          pricingVariants.map((variant: PricingVariant) =>
            tx.activityPricing.create({
              data: {
                activityId: activity.id,
                playerType: variant.playerType,
                duration: variant.duration || null,
                priceType: variant.priceType,
                price: typeof variant.price === "number" ? variant.price : 0,
              },
            })
          )
        );
      }

      return activity;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
