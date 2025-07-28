// app/api/business/[id]/marketplace-step/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const stepDataSchema = z.object({
  step: z.enum(["about", "gallery", "openingTimes", "facilities", "contact"]),
  data: z.record(z.any()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = params.id;

    // Verify user owns this business
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        ownerId: session.user.id,
        isActive: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found or access denied" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { step, data } = stepDataSchema.parse(body);

    // Handle each step differently based on the data structure
    switch (step) {
      case "about":
        await prisma.business.update({
          where: { id: businessId },
          data: {
            description: data.description || "",
            highlights: data.highlights || [],
            logo: data.logo || null,
          },
        });
        break;

      case "gallery":
        // Handle image uploads/updates
        // This would integrate with your existing image upload logic
        if (data.images && Array.isArray(data.images)) {
          // Delete existing images if replacing
          await prisma.businessImage.deleteMany({
            where: { businessId },
          });

          // Add new images
          if (data.images.length > 0) {
            await prisma.businessImage.createMany({
              data: data.images.map((img: any, index: number) => ({
                businessId,
                imageUrl: img.imageUrl,
                altText: img.altText || "",
                displayOrder: index + 1,
              })),
            });
          }
        }
        break;

      case "openingTimes":
        // Handle opening hours
        if (data.openingHours) {
          // Delete existing opening hours
          await prisma.openingHour.deleteMany({
            where: { businessId },
          });

          // Add new opening hours
          const openingHourData = [];
          for (const [dayIndex, dayHours] of Object.entries(
            data.openingHours
          )) {
            const dayOfWeek = parseInt(dayIndex);

            if (Array.isArray(dayHours) && dayHours.length > 0) {
              for (const timeSlot of dayHours) {
                openingHourData.push({
                  businessId,
                  dayOfWeek,
                  openTime: timeSlot.openTime,
                  closeTime: timeSlot.closeTime,
                  isClosed: false,
                });
              }
            } else {
              // Day is closed
              openingHourData.push({
                businessId,
                dayOfWeek,
                openTime: "09:00",
                closeTime: "17:00",
                isClosed: true,
              });
            }
          }

          if (openingHourData.length > 0) {
            await prisma.openingHour.createMany({
              data: openingHourData,
            });
          }
        }
        break;

      case "facilities":
        // Handle facilities
        if (data.facilities && Array.isArray(data.facilities)) {
          // Delete existing business-facility relationships
          await prisma.businessFacility.deleteMany({
            where: { businessId },
          });

          // Add new facilities
          if (data.facilities.length > 0) {
            await prisma.businessFacility.createMany({
              data: data.facilities.map((facilityId: string) => ({
                businessId,
                facilityId,
              })),
            });
          }
        }
        break;

      case "contact":
        // Handle contact info and socials
        await prisma.business.update({
          where: { id: businessId },
          data: {
            phone: data.phone || null,
            email: data.email || null,
            website: data.website || null,
          },
        });

        // Handle socials
        if (data.socials) {
          // Delete existing socials
          await prisma.businessSocial.deleteMany({
            where: { businessId },
          });

          // Add new socials
          const socialData = [];
          for (const [platform, url] of Object.entries(data.socials)) {
            if (url && typeof url === "string" && url.trim()) {
              socialData.push({
                businessId,
                platform: platform.toLowerCase(),
                url: url.trim(),
              });
            }
          }

          if (socialData.length > 0) {
            await prisma.businessSocial.createMany({
              data: socialData,
            });
          }
        }
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving marketplace step:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
