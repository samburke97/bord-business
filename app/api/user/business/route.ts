// app/api/user/business/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { BusinessType } from "@prisma/client";

interface CreateUserBusinessRequest {
  businessName: string;
  businessType: string;
  address: string;
  streetAddress: string;
  aptSuite?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  sports: Array<{
    id: string;
    name: string;
  }>;
}

// Helper function to generate a unique slug
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.business.findUnique({
      where: { slug },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Helper function to map business type string to enum
function mapBusinessType(typeString: string): BusinessType {
  // Try to match the string directly to enum values
  const normalizedType = typeString.toUpperCase().replace(/\s+/g, "_");

  // Check if it's a valid BusinessType enum value
  if (Object.values(BusinessType).includes(normalizedType as BusinessType)) {
    return normalizedType as BusinessType;
  }

  // Fallback to OTHER for any unrecognized types
  return BusinessType.OTHER;
}

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body: CreateUserBusinessRequest = await request.json();
    const {
      businessName,
      businessType,
      address,
      streetAddress,
      aptSuite,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      sports,
    } = body;

    // Validation
    if (!businessName?.trim()) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    if (
      !streetAddress?.trim() ||
      !city?.trim() ||
      !state?.trim() ||
      !postalCode?.trim()
    ) {
      return NextResponse.json(
        { error: "Complete address is required" },
        { status: 400 }
      );
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(businessName);

    // Create business and center in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the business
      const business = await tx.business.create({
        data: {
          name: businessName.trim(),
          slug,
          description: null,
          address,
          city,
          state,
          postalCode,
          latitude: latitude ? parseFloat(latitude.toString()) : null,
          longitude: longitude ? parseFloat(longitude.toString()) : null,
          businessType: mapBusinessType(businessType),
          ownerId: session.user.id,
          isActive: true,
          isVerified: false, // Requires admin verification
        },
      });

      // 2. Create the main center/location for this business
      const center = await tx.center.create({
        data: {
          name: businessName.trim(), // Use business name as center name
          address,
          latitude: latitude ? parseFloat(latitude.toString()) : null,
          longitude: longitude ? parseFloat(longitude.toString()) : null,
          businessId: business.id,
          isActive: true, // Centers can be active even if business is unverified
        },
      });

      // 3. Link sports to the center (if any selected)
      if (sports && sports.length > 0) {
        await tx.sportCenter.createMany({
          data: sports.map((sport) => ({
            centerId: center.id,
            sportId: sport.id,
          })),
          skipDuplicates: true,
        });
      }

      return { business, center };
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        business: {
          id: result.business.id,
          name: result.business.name,
          slug: result.business.slug,
        },
        center: {
          id: result.center.id,
          name: result.center.name,
        },
        message: "Business created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user business:", error);

    return NextResponse.json(
      { error: "Failed to create business. Please try again." },
      { status: 500 }
    );
  }
}
