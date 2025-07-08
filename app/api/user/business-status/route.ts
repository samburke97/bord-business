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
      console.log("❌ Business Status API: No valid session");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 Business Status API: Checking status for user:", {
      userId: session.user.id,
      email: session.user.email,
    });

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
      console.log("❌ Business Status API: User not found");
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

    console.log("📊 Business Status API: User business analysis:", {
      userId: session.user.id,
      email: session.user.email,
      ownedBusinessesCount: activeOwnedBusinesses.length,
      membershipsCount: activeMemberships.length,
      hasOwnedBusiness,
      hasBusinessMembership,
      needsSetup,
      ownedBusinessNames: activeOwnedBusinesses.map((b) => b.name),
      membershipBusinessNames: activeMemberships.map((m) => m.business.name),
    });

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

    console.log("✅ Business Status API: Response:", {
      needsSetup: responseData.needsSetup,
      hasOwnedBusiness: responseData.hasOwnedBusiness,
      hasBusinessMembership: responseData.hasBusinessMembership,
      businessCount: responseData.businessCount,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ Business Status API: Error:", error);

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
