import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET handler for fetching opening hours
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    // Fetch all opening hours for the given center
    const openingHoursData = await prisma.openingHours.findMany({
      where: { centerId: id },
      orderBy: { dayOfWeek: "asc" },
    });

    // Transform the data into the format expected by the frontend
    const formattedOpeningHours: {
      [key: number]: Array<{ openTime: string; closeTime: string }>;
    } = {};

    // Initialize all days as empty arrays
    for (let i = 0; i < 7; i++) {
      formattedOpeningHours[i] = [];
    }

    // Populate with data from database
    openingHoursData.forEach((hours) => {
      if (hours.isOpen) {
        formattedOpeningHours[hours.dayOfWeek].push({
          openTime: hours.openTime,
          closeTime: hours.closeTime,
        });
      }
    });

    return NextResponse.json(formattedOpeningHours);
  } catch (error) {
    console.error("Error fetching opening hours:", error);
    return NextResponse.json(
      { error: "Failed to fetch opening hours" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST handler for creating/updating opening hours
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;
    const { openingHours } = await request.json();

    // First, delete all existing opening hours for this center
    await prisma.openingHours.deleteMany({
      where: { centerId: id },
    });

    // Then, insert the new opening hours
    const openingHoursToCreate = [];

    for (const [dayOfWeekStr, timeSlots] of Object.entries(openingHours)) {
      const dayOfWeek = parseInt(dayOfWeekStr);
      const slots = timeSlots as Array<{ openTime: string; closeTime: string }>;

      if (slots.length === 0) {
        // For closed days, create a single entry with isOpen=false
        openingHoursToCreate.push({
          centerId: id,
          dayOfWeek,
          isOpen: false,
          openTime: "09:00", // Default times, won't be used since isOpen=false
          closeTime: "17:00",
        });
      } else {
        // For open days, create an entry for each time slot
        for (const slot of slots) {
          openingHoursToCreate.push({
            centerId: id,
            dayOfWeek,
            isOpen: true,
            openTime: slot.openTime,
            closeTime: slot.closeTime,
          });
        }
      }
    }

    // Create all opening hours in a single transaction
    await prisma.openingHours.createMany({
      data: openingHoursToCreate,
    });

    return NextResponse.json(
      { message: "Opening hours updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating opening hours:", error);
    return NextResponse.json(
      {
        error: "Failed to update opening hours",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
