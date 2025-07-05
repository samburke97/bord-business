// app/api/user/business-status/route.ts - COMPLETE ENHANCED WITH SECURITY & DEBUGGING
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { constantTimeDelay } from "@/lib/security/utils/utils";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Business Status API: Request received");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("❌ Business Status API: No session or user ID");
      await constantTimeDelay();
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log(
      "✅ Business Status API: Session found for user:",
      session.user.id
    );

    // Check if user has any businesses
    const userWithBusinesses = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        ownedBusinesses: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            isActive: true,
          },
        },
        businessMemberships: {
          include: {
            business: {
              select: {
                id: true,
                businessName: true,
                slug: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!userWithBusinesses) {
      console.log("❌ Business Status API: User not found in database");
      await constantTimeDelay();
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Determine if user needs business setup
    const activeOwnedBusinesses = userWithBusinesses.ownedBusinesses.filter(
      (business) => business.isActive
    );
    const activeMemberships = userWithBusinesses.businessMemberships.filter(
      (membership) => membership.business.isActive
    );

    const hasOwnedBusiness = activeOwnedBusinesses.length > 0;
    const hasBusinessMembership = activeMemberships.length > 0;
    const needsBusinessSetup = !hasOwnedBusiness && !hasBusinessMembership;

    console.log("📊 Business Status API: User business analysis:", {
      userId: session.user.id,
      ownedBusinessesCount: activeOwnedBusinesses.length,
      membershipsCount: activeMemberships.length,
      hasOwnedBusiness,
      hasBusinessMembership,
      needsBusinessSetup,
    });

    const response = {
      needsBusinessSetup,
      hasOwnedBusiness,
      hasBusinessMembership,
      ownedBusinesses: activeOwnedBusinesses,
      membershipBusinesses: activeMemberships.map((membership) => ({
        ...membership.business,
        role: membership.role,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Business Status API: Error:", error);
    await constantTimeDelay();
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
