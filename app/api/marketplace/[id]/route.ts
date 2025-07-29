import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const location = await prisma.center.findUnique({
      where: { id },
      include: {
        establishment: true,
        tags: {
          include: {
            tag: true,
          },
        },
        facilities: {
          include: {
            tag: true,
          },
        },
        images: true,
        links: true,
        socials: true,
        sportCenters: {
          include: {
            sport: true,
          },
        },
        // Include activities relation - simplified for string-based pricing
        activities: {
          include: {
            activity: {
              include: {
                // Now we just need the pricing variants without nested includes
                pricingVariants: true,
              },
            },
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Format the data for the frontend
    const formattedLocation = {
      id: location.id,
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      description: location.description,
      highlights: location.highlights,
      phone: location.phone,
      email: location.email,
      status: location.isActive ? "Active" : "Inactive",
      isActive: location.isActive,
      establishment: location.establishment?.name || null,
      establishmentId: location.establishmentId,
      sports:
        location.sportCenters?.map((sportCenter) => ({
          id: sportCenter.sport.id,
          name: sportCenter.sport.name,
          imageUrl: sportCenter.sport.imageUrl,
        })) || [],
      tags:
        location.tags?.map((centerTag) => ({
          id: centerTag.tag.id,
          name: centerTag.tag.name,
          imageUrl: centerTag.tag.imageUrl,
        })) || [],
      facilities:
        location.facilities?.map((facility) => ({
          id: facility.tag.id,
          name: facility.tag.name,
          imageUrl: facility.tag.imageUrl,
        })) || [],
      images:
        location.images?.map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
        })) || [],
      links: location.links || [],
      socials: location.socials || [],
      lastEdited: location.lastEdited.toISOString(),
      // Updated activities to use direct string values
      activities:
        location.activities?.map((activityEntry) => {
          const activity = activityEntry.activity;
          // Get the first pricing variant or default values
          const pricing = activity.pricingVariants[0] || null;

          // Format price appropriately
          let priceText;
          if (!pricing) {
            priceText = "Price not available";
          } else if (
            pricing.price.toString() === "0" ||
            pricing.priceType.toLowerCase() === "free"
          ) {
            priceText = "Free";
          } else if (pricing.priceType.toLowerCase() === "from") {
            priceText = `From $${pricing.price}`;
          } else {
            priceText = `$${pricing.price}`;
          }

          return {
            id: activity.id,
            title: activity.title,
            description: activity.description,
            imageUrl: activity.imageUrl,
            price: priceText,
            playerType: pricing?.playerType || "Everyone",
            duration: pricing?.duration || "Not Specified",
            priceType: pricing?.priceType || "Fixed",
            buttonTitle: activity.buttonTitle,
            buttonLink: activity.buttonLink,
          };
        }) || [],
    };

    return NextResponse.json(formattedLocation);
  } catch (error) {
    console.error("Error fetching location details:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch location details",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    const data = await request.json();

    const {
      name,
      categoryId,
      sports = [],
      address,
      latitude,
      longitude,
      description,
      phone,
      email,
      isActive,
    } = data;

    // Update the center's basic information
    const updatedCenter = await prisma.center.update({
      where: { id },
      data: {
        name,
        address,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null,
        description,
        phone,
        email,
        isActive: isActive ?? false,
        establishmentId: categoryId || null,
      },
    });

    // Update sports - first remove existing relationships, then add new ones
    if (sports && sports.length > 0) {
      // Delete existing sport connections
      await prisma.sportCenter.deleteMany({
        where: { centerId: id },
      });

      // Add new sport connections
      await prisma.sportCenter.createMany({
        data: sports.map((sport: { id: string }) => ({
          centerId: id,
          sportId: sport.id,
        })),
        skipDuplicates: true,
      });

      // Optionally, update sport's center count
      await Promise.all(
        sports.map(async (sport: { id: string }) => {
          const centerCount = await prisma.sportCenter.count({
            where: { sportId: sport.id },
          });

          await prisma.sport.update({
            where: { id: sport.id },
            data: { centerCount },
          });
        })
      );
    }

    return NextResponse.json(updatedCenter);
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Failed to update location", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    await prisma.center.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json(
      { error: "Failed to delete location", details: (error as Error).message },
      { status: 500 }
    );
  }
}
