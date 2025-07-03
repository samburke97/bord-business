// app/api/user/business-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has any businesses
    const userWithBusinesses = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedBusinesses: true,
        businessMemberships: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!userWithBusinesses) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Determine if user needs business setup
    const hasOwnedBusiness = userWithBusinesses.ownedBusinesses.length > 0;
    const hasBusinessMembership =
      userWithBusinesses.businessMemberships.length > 0;

    const needsSetup = !hasOwnedBusiness && !hasBusinessMembership;

    return NextResponse.json({
      needsSetup,
      hasOwnedBusiness,
      hasBusinessMembership,
      businessCount: userWithBusinesses.ownedBusinesses.length,
      membershipCount: userWithBusinesses.businessMemberships.length,
    });
  } catch (error) {
    console.error("Business status check error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
