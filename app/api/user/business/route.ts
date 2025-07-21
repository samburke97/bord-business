// app/api/user/business/route.ts - FIXED: Proper Error Handling & Field Mapping
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CSRFProtection } from "@/lib/security/csrf";
import prisma from "@/lib/prisma";
import { constantTimeDelay } from "@/lib/security/password";

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

    // CRITICAL FIX: Map frontend field names to backend expectations
    const {
      businessName,
      businessCategory, // Frontend sends this
      businessType, // Legacy field - might still be sent
      address,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      sports = [],
    } = body;

    // Use businessCategory (new) or fallback to businessType (legacy)
    const categoryId = businessCategory || businessType;

    // Basic validation with user-friendly messages
    if (!businessName?.trim()) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Business name is required",
        },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Please select a business category",
        },
        { status: 400 }
      );
    }

    if (!address?.trim()) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Business address is required",
        },
        { status: 400 }
      );
    }

    if (!city?.trim() || !state?.trim() || !postalCode?.trim()) {
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Complete address information is required",
        },
        { status: 400 }
      );
    }

    // Validate that the category exists and is valid
    const categoryValidation = await prisma.tag.findFirst({
      where: {
        id: categoryId,
        isDeleted: false,
        groups: {
          some: {
            group: {
              type: "CATEGORY",
            },
          },
        },
      },
    });

    if (!categoryValidation) {
      console.error("❌ Business API: Invalid category ID:", categoryId);
      return NextResponse.json(
        {
          error: "Invalid category",
          message: "Please select a valid business category",
        },
        { status: 400 }
      );
    }

    console.log(
      "✅ Business API: Valid category found:",
      categoryValidation.name
    );

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

    // Ensure unique slug
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

    console.log("🏷️ Business API: Generated unique slug:", slug);

    // Create business with transaction
    const business = await prisma.$transaction(async (tx) => {
      // CRITICAL FIX: Use categoryId instead of businessType
      const newBusiness = await tx.business.create({
        data: {
          name: businessName.trim(),
          slug,
          categoryId, // Use the dynamic category ID
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          latitude: latitude ? parseFloat(latitude.toString()) : null,
          longitude: longitude ? parseFloat(longitude.toString()) : null,
          ownerId: session.user.id,
          isActive: true,
          isVerified: false,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
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
        console.log(
          "⚽ Business API: Adding sports relationships:",
          sports.length
        );

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

          console.log("✅ Business API: Sports relationships created");
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
          categoryId: business.categoryId,
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

    // CRITICAL: Log technical details for developers but NEVER show to users
    console.error("❌ Business API: Technical error occurred:", {
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      userId: session?.user?.id || "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific errors with user-friendly messages
    if (error instanceof Error) {
      // Database constraint violations
      if (
        error.message.includes("Unique constraint") ||
        error.message.includes("unique constraint")
      ) {
        return NextResponse.json(
          {
            error: "Duplicate business",
            message:
              "A business with this name already exists. Please choose a different name.",
          },
          { status: 409 }
        );
      }

      // Foreign key violations (invalid references)
      if (
        error.message.includes("foreign key") ||
        error.message.includes("Foreign key")
      ) {
        return NextResponse.json(
          {
            error: "Invalid data",
            message:
              "Some of the selected options are no longer available. Please refresh and try again.",
          },
          { status: 400 }
        );
      }

      // Validation errors from Prisma
      if (
        error.message.includes("Invalid") ||
        error.message.includes("validation") ||
        error.message.includes("Expected")
      ) {
        return NextResponse.json(
          {
            error: "Invalid data",
            message: "Please check your inputs and try again.",
          },
          { status: 400 }
        );
      }
    }

    // Apply security delay
    await constantTimeDelay();

    // Generic user-friendly error - NEVER expose technical details
    return NextResponse.json(
      {
        error: "Unable to create business",
        message:
          "We're having trouble creating your business right now. Please try again in a few moments.",
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
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
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
    console.error("❌ Business API: Error fetching businesses:", error);
    await constantTimeDelay();
    return NextResponse.json(
      {
        error: "Unable to load businesses",
        message: "Please try again in a few moments.",
      },
      { status: 500 }
    );
  }
}
