import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Define an interface for the sport object
interface SportSelection {
  id: string;
  name?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("search") || "";

    const locations = await prisma.center.findMany({
      where: {
        ...(searchQuery
          ? {
              OR: [{ name: { contains: searchQuery, mode: "insensitive" } }],
            }
          : {}),
      },
      include: {
        establishment: true,
        images: {
          take: 1,
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        lastEdited: "desc",
      },
    });

    // Format the response data
    const formattedLocations = locations.map((location) => ({
      id: location.id,
      name: location.name,
      address: location.address,
      // Prioritize logoUrl, fall back to first image
      imageUrl:
        location.logoUrl ||
        (location.images.length > 0 ? location.images[0].imageUrl : null),
      logoUrl: location.logoUrl,
      status: location.isActive ? "Active" : "Inactive",
      establishment: location.establishment
        ? location.establishment.name
        : "Not specified",
      lastUpdated: location.lastEdited.toISOString(),
    }));

    return NextResponse.json(formattedLocations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const requestText = await request.text();

    let data;
    try {
      data = JSON.parse(requestText);
    } catch (error) {
      console.error("Failed to parse request JSON:", error);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Extract data from the request body
    const {
      name,
      categoryId,
      sports = [],
      address,
      streetAddress,
      aptSuite,
      city,
      state,
      postcode,
      latitude,
      longitude,
    } = data;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Format the complete address if components are available
    const formattedAddress =
      address ||
      [streetAddress, aptSuite, city, state, postcode]
        .filter(Boolean)
        .join(", ");

    // Create the center with its basic properties and establishment relation
    try {
      const center = await prisma.center.create({
        data: {
          name,
          address: formattedAddress,
          latitude: latitude ? parseFloat(latitude.toString()) : null,
          longitude: longitude ? parseFloat(longitude.toString()) : null,
          establishmentId: categoryId || null,
          isActive: false, // Default to inactive until approved
        },
      });

      // Link the center to each selected sport
      if (sports && sports.length > 0) {
        try {
          // Use createMany for bulk insertion of sport-center associations
          await prisma.sportCenter.createMany({
            data: sports.map((sport: SportSelection) => ({
              centerId: center.id,
              sportId: sport.id,
            })),
            skipDuplicates: true,
          });
        } catch (sportError) {
          console.error("Error adding sports to center:", sportError);
          // Continue even if sports addition fails
        }
      }

      // Return the created center
      const responseJson = JSON.stringify(center);

      return new NextResponse(responseJson, {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (dbError) {
      console.error("Database error creating center:", dbError);
      return NextResponse.json(
        {
          error: "Database error creating center",
          details: (dbError as Error).message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location", details: (error as Error).message },
      { status: 500 }
    );
  }
}
