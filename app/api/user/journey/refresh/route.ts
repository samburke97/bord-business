// app/api/user/journey/refresh/route.ts - COMPLETE REFRESH ENDPOINT
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserJourneyService } from "@/lib/services/UserJourneyService";

interface RefreshResponse {
  success: boolean;
  message: string;
  sessionData?: any;
  performance?: {
    responseTime: number;
    cacheStatus: string;
    forced: boolean;
  };
}

/**
 * ✅ POST handler for force refresh
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<RefreshResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const forceRefresh = request.headers.get("X-Force-Refresh") === "true";

    const startTime = Date.now();

    // ✅ Force refresh from database
    const freshJourney = await UserJourneyService.forceRefreshCache(
      session.user.id
    );
    const sessionData = UserJourneyService.createJourneyCacheData(freshJourney);

    const responseTime = Date.now() - startTime;

    console.log(
      `Cache force-refreshed for user ${session.user.id} in ${responseTime}ms`
    );

    const response: RefreshResponse = {
      success: true,
      message: "Journey refreshed successfully",
      sessionData,
      performance: {
        responseTime,
        cacheStatus: "refreshed",
        forced: forceRefresh,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Journey refresh failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Refresh failed",
      },
      { status: 500 }
    );
  }
}

/**
 * ✅ GET handler for refresh status
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

    // Get current cache status
    const lastRefresh = session.user?.lastJourneyRefresh;
    const cacheAge = lastRefresh
      ? Date.now() - new Date(lastRefresh).getTime()
      : null;

    return NextResponse.json({
      success: true,
      cacheInfo: {
        lastRefresh,
        cacheAge,
        isStale: cacheAge ? cacheAge > 5 * 60 * 1000 : true, // 5 minutes
        isExpired: cacheAge ? cacheAge > 10 * 60 * 1000 : true, // 10 minutes
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Status check failed",
      },
      { status: 500 }
    );
  }
}
