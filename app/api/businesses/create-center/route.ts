// app/api/businesses/create-center/route.ts - FIXED TO PREVENT DUPLICATES
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

    // ✅ FIXED: Use a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Verify user owns this business and get business data
      const business = await tx.business.findFirst({
        where: {
          id: businessId,
          ownerId: session.user.id,
        },
        include: {
          centers: {
            where: {
              isDeleted: false,
            },
            orderBy: {
              createdAt: "desc",
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
        throw new Error("Business not found or unauthorized");
      }

      console.log(
        "✅ Found business:",
        business.name,
        "with",
        business.centers.length,
        "existing centers"
      );

      // ✅ CRITICAL: Check if center already exists (race condition protection)
      if (business.centers.length > 0) {
        const existingCenter = business.centers[0];
        console.log(
          "ℹ️ Center already exists, returning existing center:",
          existingCenter.id
        );
        return {
          success: true,
          centerId: existingCenter.id,
          message: "Using existing location",
          isNew: false,
          center: {
            id: existingCenter.id,
            name: existingCenter.name,
            businessId: existingCenter.businessId,
          },
        };
      }

      console.log("🔨 Creating new center from business data...");

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

      return {
        success: true,
        centerId: newCenter.id,
        message: "First location created successfully",
        isNew: true,
        center: {
          id: newCenter.id,
          name: newCenter.name,
          businessId: newCenter.businessId,
        },
      };
    });

    console.log("🎉 Center creation/retrieval completed successfully");
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error creating center from business:", error);

    // ✅ IMPROVED: Handle specific database errors
    if (error instanceof Error) {
      // Handle unique constraint violations gracefully
      if (
        error.message.includes("Unique constraint") ||
        error.message.includes("unique_violation")
      ) {
        // If there's a unique constraint error, fetch the existing center
        try {
          const { businessId } = await request.json();
          const business = await prisma.business.findFirst({
            where: {
              id: businessId,
              ownerId: session?.user?.id,
            },
            include: {
              centers: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          });

          if (business?.centers[0]) {
            console.log(
              "🔄 Returning existing center after constraint error:",
              business.centers[0].id
            );
            return NextResponse.json({
              success: true,
              centerId: business.centers[0].id,
              message: "Using existing location",
              isNew: false,
            });
          }
        } catch (fetchError) {
          console.error("Failed to fetch existing center:", fetchError);
        }
      }
    }

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
