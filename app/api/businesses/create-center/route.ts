// app/api/businesses/create-center/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { businessId } = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    console.log(
      "🔍 Creating center for business:",
      businessId,
      "by user:",
      session.user.id
    );

    // Verify user owns this business and get business data
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        ownerId: session.user.id,
      },
      include: {
        centers: {
          where: {
            isDeleted: false,
          },
        },
        sports: {
          include: {
            sport: true,
          },
        },
      },
    });

    if (!business) {
      console.log(
        "❌ Business not found or unauthorized for business:",
        businessId
      );
      return NextResponse.json(
        { error: "Business not found or unauthorized" },
        { status: 404 }
      );
    }

    console.log(
      "✅ Found business:",
      business.name,
      "with",
      business.centers.length,
      "existing centers"
    );

    // Check if center already exists
    if (business.centers.length > 0) {
      console.log(
        "ℹ️ Center already exists, returning existing center:",
        business.centers[0].id
      );
      return NextResponse.json({
        success: true,
        centerId: business.centers[0].id,
        message: "Using existing location",
      });
    }

    console.log("🔨 Creating new center from business data...");

    // Create center from business data using Fresha's approach
    const center = await prisma.$transaction(async (tx) => {
      // Create the center with inherited business data
      const newCenter = await tx.center.create({
        data: {
          name: business.name, // Inherit business name
          address: business.address, // Inherit business address
          latitude: business.latitude,
          longitude: business.longitude,
          description: business.description, // Start with business description
          phone: business.phone, // Inherit business phone
          email: business.email, // Inherit business email
          establishmentId: business.categoryId, // Map business category to center establishment
          businessId: business.id, // Link center to business
          isActive: true, // User-created centers are active by default
          logoUrl: business.logo, // Inherit business logo
        },
      });

      console.log("✅ Created center:", newCenter.id, "named:", newCenter.name);

      // Copy business sports to center
      if (business.sports.length > 0) {
        const sportData = business.sports.map((businessSport) => ({
          centerId: newCenter.id,
          sportId: businessSport.sportId,
        }));

        console.log("🏃 Adding", sportData.length, "sports to center");

        await tx.sportCenter.createMany({
          data: sportData,
          skipDuplicates: true,
        });
      } else {
        console.log("ℹ️ No sports to copy from business");
      }

      return newCenter;
    });

    console.log("🎉 Center creation completed successfully");

    return NextResponse.json({
      success: true,
      centerId: center.id,
      message: "First location created successfully",
      center: {
        id: center.id,
        name: center.name,
        businessId: center.businessId,
      },
    });
  } catch (error) {
    console.error("❌ Error creating center from business:", error);
    return NextResponse.json(
      {
        error: "Failed to create location",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
}
