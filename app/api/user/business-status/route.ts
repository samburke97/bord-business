// app/api/user/business-status/route.ts - FIXED LOGIC
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

    // Find user with their business relationships
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        ownedBusinesses: {
          where: {
            isActive: true,
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

    // FIXED LOGIC: User needs setup if they have NO business connection at all
    const needsSetup = !hasOwnedBusiness && !hasBusinessMembership;

    const responseData = {
      needsSetup,
      hasOwnedBusiness,
      hasBusinessMembership,
      businessCount: activeOwnedBusinesses.length,
      membershipCount: activeMemberships.length,
      ownedBusinesses: activeOwnedBusinesses,
      memberships: activeMemberships.map((m) => ({
        ...m.business,
        role: m.role,
      })),
      // Add business data for dashboard
      businessData: hasOwnedBusiness
        ? {
            businessName: activeOwnedBusinesses[0].name,
            businessType: activeOwnedBusinesses[0].businessType,
          }
        : null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    // Apply constant time delay for security
    await constantTimeDelay();

    return NextResponse.json(
      {
        message: "Internal server error",
        needsSetup: true, // Default to requiring setup on error
      },
      { status: 500 }
    );
  }
}
