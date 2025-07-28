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

    // Verify user owns this business
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
      return NextResponse.json(
        { error: "Business not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if center already exists
    if (business.centers.length > 0) {
      return NextResponse.json({
        success: true,
        centerId: business.centers[0].id,
        message: "Center already exists",
      });
    }

    // Create center from business data
    const center = await prisma.$transaction(async (tx) => {
      // Create the center with business data
      const newCenter = await tx.center.create({
        data: {
          name: business.name,
          address: business.address,
          latitude: business.latitude,
          longitude: business.longitude,
          description: business.description,
          phone: business.phone,
          email: business.email,
          establishmentId: business.categoryId, // Map business category to center establishment
          businessId: business.id, // Link center to business
          isActive: true, // User-created centers are active by default
          logoUrl: business.logo, // Map business logo to center logoUrl
        },
      });

      // Copy business sports to center
      if (business.sports.length > 0) {
        await tx.sportCenter.createMany({
          data: business.sports.map((businessSport) => ({
            centerId: newCenter.id,
            sportId: businessSport.sportId,
          })),
          skipDuplicates: true,
        });
      }

      return newCenter;
    });

    return NextResponse.json({
      success: true,
      centerId: center.id,
      message: "Center created successfully from business data",
      center: {
        id: center.id,
        name: center.name,
        businessId: center.businessId,
      },
    });
  } catch (error) {
    console.error("Error creating center from business:", error);
    return NextResponse.json(
      { error: "Failed to create center" },
      { status: 500 }
    );
  }
}
