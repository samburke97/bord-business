// app/api/business/[id]/marketplace-complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    // Mark business as marketplace-ready
    await prisma.business.update({
      where: { id: businessId },
      data: {
        isMarketplaceReady: true,
        marketplaceCompletedAt: new Date(),
        // Set business as active/live if not already
        status: "ACTIVE",
      },
    });

    // Optional: Record completion in user journey
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingStep: "MARKETPLACE_COMPLETED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Marketplace profile completed successfully",
    });
  } catch (error) {
    console.error("Error completing marketplace setup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
