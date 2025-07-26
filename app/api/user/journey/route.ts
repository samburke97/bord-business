// app/api/user/journey/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  UserJourneyService,
  OnboardingStep,
  BusinessIntention,
} from "@/lib/services/UserJourneyService";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const journeyState = await UserJourneyService.getUserJourneyState(
      session.user.id
    );
    const nextRoute = UserJourneyService.determineNextRoute(journeyState);

    return NextResponse.json({
      ...journeyState,
      nextRoute,
    });
  } catch (error) {
    console.error("Journey GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      step,
      intention,
      hasViewedSuccess,
      onboardingData,
      emailVerified,
      profileCompleted,
    } = body;

    const updates: any = {
      step,
      intention,
      hasViewedSuccess,
      onboardingData,
    };

    if (emailVerified) {
      updates.emailVerifiedAt = new Date();
    }

    if (profileCompleted) {
      updates.profileCompletedAt = new Date();
    }

    await UserJourneyService.updateUserJourney(session.user.id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Journey POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
