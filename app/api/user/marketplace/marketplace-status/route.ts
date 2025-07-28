// app/api/user/marketplace-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's business
    const business = await prisma.business.findFirst({
      where: {
        ownerId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        highlights: true,
        logo: true,
        phone: true,
        email: true,
        website: true,
        images: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
        facilities: {
          select: {
            id: true,
            name: true,
          },
        },
        socials: {
          select: {
            platform: true,
            url: true,
          },
        },
        openingHours: {
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
            isClosed: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({
        isComplete: false,
        businessId: null,
        completedSections: {
          about: false,
          gallery: false,
          openingTimes: false,
          facilities: false,
          contact: false,
        },
      });
    }

    // Check completion status for each section
    const completedSections = {
      about: !!(business.description && business.description.trim().length > 0),
      gallery: business.images.length > 0,
      openingTimes: business.openingHours.length > 0,
      facilities: business.facilities.length > 0,
      contact: !!(business.phone || business.email || business.website),
    };

    const isComplete = Object.values(completedSections).every(Boolean);

    return NextResponse.json({
      isComplete,
      businessId: business.id,
      completedSections,
    });
  } catch (error) {
    console.error("Error fetching marketplace status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
