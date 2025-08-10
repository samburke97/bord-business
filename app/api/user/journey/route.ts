import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserJourneyService } from "@/lib/services/UserJourneyService";
import {
  OnboardingStep,
  BusinessIntention,
} from "@/lib/services/UserJourneyTypes";

interface JourneyUpdateRequest {
  step?: OnboardingStep;
  intention?: BusinessIntention;
  hasViewedSuccess?: boolean;
  onboardingData?: any;
  emailVerifiedAt?: string;
  profileCompletedAt?: string;
  isProfileComplete?: boolean;
  hasBusinessConnection?: boolean;
  _metadata?: {
    attempt?: number;
    optimisticUpdate?: boolean;
    timestamp?: string;
  };
}

interface JourneyUpdateResponse {
  success: boolean;
  message: string;
  sessionData?: any;
  user?: any;
  performance?: {
    databaseTime: number;
    sessionTime: number;
    totalTime: number;
  };
  metadata?: {
    cacheHit: boolean;
    attempt: number;
    optimisticUpdate: boolean;
  };
}

/**
 * ✅ GET handler for journey state retrieval
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    const journeyState = await UserJourneyService.getUserJourneyState(
      session.user.id
    );
    const responseTime = Date.now() - startTime;

    // ✅ Get next route recommendation
    const nextRoute = UserJourneyService.determineNextRoute(journeyState);

    // ✅ Create session-compatible data
    const sessionData = UserJourneyService.createJourneyCacheData(journeyState);

    const response = {
      success: true,
      data: {
        ...journeyState,
        nextRoute,
      },
      sessionData,
      performance: {
        responseTime,
        cacheHit: responseTime < 50, // Likely from cache if under 50ms
      },
    };

    // ✅ Add performance headers
    const headers = new Headers();
    headers.set("X-Response-Time", responseTime.toString());
    headers.set("X-Cache-Hit", (responseTime < 50).toString());

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error("Journey GET failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * ✅ Enhanced POST handler with complete session refresh
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<JourneyUpdateResponse>> {
  const startTime = Date.now();
  let dbStartTime = 0;
  let dbEndTime = 0;
  let sessionStartTime = 0;
  let sessionEndTime = 0;

  let session: any = null;
  let body: JourneyUpdateRequest = {};

  try {
    // ✅ Authentication check
    session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Parse and validate request
    body = await request.json();
    const { _metadata, ...updates } = body;

    // ✅ Convert string dates back to Date objects
    const processedUpdates = {
      ...updates,
      emailVerifiedAt: updates.emailVerifiedAt
        ? new Date(updates.emailVerifiedAt)
        : undefined,
      profileCompletedAt: updates.profileCompletedAt
        ? new Date(updates.profileCompletedAt)
        : undefined,
    };

    // ✅ Handle legacy field names for backward compatibility
    const legacyUpdates: any = {};

    if (processedUpdates.step !== undefined) {
      legacyUpdates.step = processedUpdates.step;
    }

    if (processedUpdates.intention !== undefined) {
      legacyUpdates.intention = processedUpdates.intention;
    }

    if (processedUpdates.hasViewedSuccess !== undefined) {
      legacyUpdates.hasViewedSuccess = processedUpdates.hasViewedSuccess;
    }

    if (processedUpdates.onboardingData !== undefined) {
      legacyUpdates.onboardingData = processedUpdates.onboardingData;
    }

    if (processedUpdates.emailVerifiedAt !== undefined) {
      legacyUpdates.emailVerifiedAt = processedUpdates.emailVerifiedAt;
    }

    if (processedUpdates.profileCompletedAt !== undefined) {
      legacyUpdates.profileCompletedAt = processedUpdates.profileCompletedAt;
    }

    // ✅ Update journey in database
    dbStartTime = Date.now();
    const updatedUser = await UserJourneyService.updateUserJourney(
      session.user.id,
      legacyUpdates
    );
    dbEndTime = Date.now();

    // ✅ Get fresh journey state for session
    sessionStartTime = Date.now();
    const freshJourneyState = await UserJourneyService.getUserJourneyState(
      session.user.id
    );
    const sessionData =
      UserJourneyService.createJourneyCacheData(freshJourneyState);
    sessionEndTime = Date.now();

    // ✅ Performance metrics
    const totalTime = Date.now() - startTime;
    const performance = {
      databaseTime: dbEndTime - dbStartTime,
      sessionTime: sessionEndTime - sessionStartTime,
      totalTime,
    };

    // ✅ Log performance for monitoring
    console.log(`Journey update performance:`, {
      userId: session.user.id.substring(0, 8) + "...",
      performance,
      updates: Object.keys(processedUpdates),
      optimistic: _metadata?.optimisticUpdate || false,
    });

    // ✅ Prepare response
    const response: JourneyUpdateResponse = {
      success: true,
      message: "Journey updated successfully",
      sessionData,
      user: {
        id: updatedUser.id,
        status: updatedUser.status,
        onboardingStep: updatedUser.onboardingStep,
        businessIntention: updatedUser.businessIntention,
        hasViewedSuccess: updatedUser.hasViewedSuccess,
      },
      performance,
      metadata: {
        cacheHit: false, // This was a DB update
        attempt: _metadata?.attempt || 1,
        optimisticUpdate: _metadata?.optimisticUpdate || false,
      },
    };

    // ✅ Add custom headers for debugging
    const headers = new Headers();
    headers.set("X-Journey-Update", "success");
    headers.set("X-Performance-Total", totalTime.toString());
    headers.set("X-Performance-DB", (dbEndTime - dbStartTime).toString());
    headers.set("X-Attempt-Count", (_metadata?.attempt || 1).toString());

    return NextResponse.json(response, { headers });
  } catch (error) {
    const totalTime = Date.now() - startTime;

    console.error("Journey update failed:", {
      error: error instanceof Error ? error.message : error,
      userId: session?.user?.id,
      performance: { totalTime },
      metadata: body?._metadata,
    });

    // ✅ Determine error type and status
    let status = 500;
    let message = "Internal server error";

    if (error instanceof Error) {
      if (error.message.includes("User not found")) {
        status = 404;
        message = "User not found";
      } else if (error.message.includes("validation")) {
        status = 400;
        message = error.message;
      }
    }

    return NextResponse.json(
      {
        success: false,
        message,
        performance: {
          databaseTime: 0,
          sessionTime: 0,
          totalTime,
        },
      },
      { status }
    );
  }
}
