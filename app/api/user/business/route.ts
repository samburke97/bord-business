// app/api/user/business/route.ts - FIXED DECIMAL HANDLING
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CSRFProtection } from "@/lib/security/csrf";
import prisma from "@/lib/prisma";
import { constantTimeDelay } from "@/lib/security/password";
import { BusinessType } from "@prisma/client";

// Simple approach - just use the coordinates as numbers and let Prisma handle conversion
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let session: any = null;

  try {
    // CSRF Protection
    const csrfResult = await CSRFProtection.middleware()(request);
    if (csrfResult) {
      console.warn("❌ Business API: CSRF validation failed");
      return csrfResult;
    }

    // Authentication check
    session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.warn("❌ Business API: Unauthorized request");
      await constantTimeDelay();
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("🏢 Business API: Request from authenticated user:", {
      userId: session.user.id,
      email: session.user.email,
    });

    // Parse request body
    const body = await request.json();
    console.log("📦 Business API: Received payload:", body);

    // Extract and validate data
    const {
      businessName,
      businessType,
      address,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      sports = [],
    } = body;

    // Basic validation
    if (
      !businessName ||
      !businessType ||
      !address ||
      !city ||
      !state ||
      !postalCode
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          message: "Please fill in all required fields",
        },
        { status: 400 }
      );
    }

    // Map business type
    const businessTypeEnum = businessType as BusinessType;

    // Generate unique slug
    const baseSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.business.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Check if user already has a business
    const existingBusiness = await prisma.business.findFirst({
      where: {
        ownerId: session.user.id,
        isActive: true,
      },
    });

    if (existingBusiness) {
      return NextResponse.json(
        {
          error: "Business limit reached",
          message: "You already have an active business",
        },
        { status: 409 }
      );
    }

    // Create business with transaction
    const business = await prisma.$transaction(async (tx) => {
      // Create business - let Prisma handle Decimal conversion automatically
      const newBusiness = await tx.business.create({
        data: {
          name: businessName.trim(),
          slug,
          businessType: businessTypeEnum,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          // Just pass the numbers directly - Prisma will convert to Decimal
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          ownerId: session.user.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          businessType: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          latitude: true,
          longitude: true,
          createdAt: true,
        },
      });

      // Handle sports if provided
      if (sports && sports.length > 0) {
        const validSports = await tx.sport.findMany({
          where: {
            id: { in: sports.map((s: any) => s.id) },
            isDeleted: false,
          },
          select: { id: true },
        });

        if (validSports.length > 0) {
          await tx.businessSport.createMany({
            data: validSports.map((sport) => ({
              businessId: newBusiness.id,
              sportId: sport.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      return newBusiness;
    });

    const processingTime = Date.now() - startTime;
    console.log("✅ Business API: Business created successfully:", {
      businessId: business.id,
      businessName: business.name,
      processingTime: `${processingTime}ms`,
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Business created successfully",
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          type: business.businessType,
          address: business.address,
          city: business.city,
          state: business.state,
          postalCode: business.postalCode,
          coordinates:
            business.latitude && business.longitude
              ? {
                  latitude: Number(business.latitude),
                  longitude: Number(business.longitude),
                }
              : null,
          createdAt: business.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error("❌ Business API: Database error occurred:", {
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      userId: session?.user?.id || "Unknown",
    });

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          {
            error: "Duplicate data",
            message: "A business with this information already exists",
          },
          { status: 409 }
        );
      }
    }

    await constantTimeDelay();
    return NextResponse.json(
      {
        error: "Server error",
        message: "Unable to create business. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businesses = await prisma.business.findMany({
      where: {
        ownerId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        address: true,
        city: true,
        state: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      businesses,
      count: businesses.length,
    });
  } catch (error) {
    console.error("❌ Business API: Error fetching businesses");
    await constantTimeDelay();
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
