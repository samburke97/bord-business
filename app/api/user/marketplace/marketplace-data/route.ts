// app/api/user/marketplace-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's business with all marketplace-related data
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
            altText: true,
            displayOrder: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
        facilities: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
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
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({
        businessId: null,
        error: "No business found. Please complete business onboarding first.",
      });
    }

    // Transform socials into the expected format
    const socialsMap = business.socials.reduce(
      (acc, social) => {
        if (social.platform) {
          acc[social.platform.toLowerCase()] = social.url || "";
        }
        return acc;
      },
      {} as Record<string, string>
    );

    // Transform opening hours into a more usable format
    const openingHoursMap = business.openingHours.reduce(
      (acc, hour) => {
        if (!acc[hour.dayOfWeek]) {
          acc[hour.dayOfWeek] = [];
        }

        if (!hour.isClosed) {
          acc[hour.dayOfWeek].push({
            openTime: hour.openTime,
            closeTime: hour.closeTime,
          });
        }

        return acc;
      },
      {} as Record<number, any[]>
    );

    // Check completion status for each section
    const completedSections = {
      about: !!(business.description && business.description.trim().length > 0),
      gallery: business.images.length > 0,
      openingTimes: business.openingHours.length > 0,
      facilities: business.facilities.length > 0,
      contact: !!(business.phone || business.email || business.website),
    };

    return NextResponse.json({
      businessId: business.id,
      description: business.description || "",
      highlights: business.highlights || [],
      logo: business.logo,
      images: business.images,
      facilities: business.facilities.map((f) => f.id),
      phone: business.phone || "",
      email: business.email || "",
      website: business.website || "",
      socials: {
        facebook: socialsMap.facebook || "",
        instagram: socialsMap.instagram || "",
        tiktok: socialsMap.tiktok || "",
        youtube: socialsMap.youtube || "",
        twitter: socialsMap.twitter || "",
      },
      openingHours: openingHoursMap,
      completedSections,
    });
  } catch (error) {
    console.error("Error fetching marketplace data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
