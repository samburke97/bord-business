import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const whereClause = isActive === "true" ? { isActive: true } : {};

    const [centers, count] = await Promise.all([
      prisma.center.findMany({
        where: whereClause,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          sportCenters: {
            include: {
              sport: true,
            },
          },
          images: true,
        },
        skip,
        take: limit,
        orderBy: {
          name: "asc",
        },
      }),
      prisma.center.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      centers,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch centers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const center = await prisma.center.create({
      data: {
        name: body.name,
        address: body.address,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        description: body.description,
        phone: body.phone,
        email: body.email,
        establishmentId: body.establishmentId,
        isActive: body.isActive || false,
        tags: {
          create:
            body.tagIds?.map((tagId: string) => ({
              tag: {
                connect: { id: tagId },
              },
            })) || [],
        },
        sportCenters: {
          create:
            body.sportIds?.map((sportId: string) => ({
              sport: {
                connect: { id: sportId },
              },
            })) || [],
        },
      },
    });

    return NextResponse.json(center, { status: 201 });
  } catch (error) {
    console.error("Error creating center:", error);
    return NextResponse.json(
      { error: "Failed to create center" },
      { status: 500 }
    );
  }
}
