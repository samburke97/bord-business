// app/api/user/business-status/route.ts - Updated to include centers
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { constantTimeDelay } from "@/lib/security/password";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Find user with their business relationships INCLUDING centers
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        ownedBusinesses: {
          where: {
            isActive: true,
          },
          include: {
            centers: {
              where: {
                isDeleted: false,
              },
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
        businessMemberships: {
          where: {
            isActive: true,
          },
          include: {
            business: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check business relationships
    const activeOwnedBusinesses = user.ownedBusinesses.filter(
      (b) => b.isActive
    );
    const activeMemberships = user.businessMemberships.filter(
      (m) => m.isActive
    );

    const hasOwnedBusiness = activeOwnedBusinesses.length > 0;
    const hasBusinessMembership = activeMemberships.length > 0;

    // User needs setup if they have NO business connection at all
    const needsSetup = !hasOwnedBusiness && !hasBusinessMembership;

    // Use the first business for marketplace setup
    let businessForMarketplace = null;
    if (hasOwnedBusiness) {
      businessForMarketplace = activeOwnedBusinesses[0];
    } else if (hasBusinessMembership) {
      businessForMarketplace = activeMemberships[0].business;
    }

    const responseData = {
      needsSetup,
      hasOwnedBusiness,
      hasBusinessMembership,
      businessCount: activeOwnedBusinesses.length,
      membershipCount: activeMemberships.length,
      // Include the business for marketplace setup
      business: businessForMarketplace,
      ownedBusinesses: activeOwnedBusinesses,
      memberships: activeMemberships.map((m) => ({
        ...m.business,
        role: m.role,
      })),
      // Add business data for dashboard (keeping existing structure)
      businessData: hasOwnedBusiness
        ? {
            businessName: activeOwnedBusinesses[0].name,
            businessType: activeOwnedBusinesses[0].categoryId,
          }
        : null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Business status API error:", error);
    // Apply constant time delay for security
    await constantTimeDelay();

    return NextResponse.json(
      {
        message: "Internal server error",
        needsSetup: true,
      },
      { status: 500 }
    );
  }
}
