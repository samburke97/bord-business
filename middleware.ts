// middleware.ts - FIXED modular version with complete logic
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { SecurityHeaders } from "./lib/middleware/SecurityHeaders";
import { AuthChecker } from "./lib/middleware/AuthChecker";
import { RouteGuard } from "./lib/middleware/RouteGuard";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const response = NextResponse.next();

  // Apply security headers (including fixed CSP)
  SecurityHeaders.apply(response);

  // Check if route needs authentication
  if (!RouteGuard.requiresAuthentication(pathname)) {
    return response;
  }

  // Get user info for protected routes
  try {
    const userInfo = await AuthChecker.getUserInfo(req);

    if (!userInfo) {
      return AuthChecker.createUnauthorizedResponse(req, pathname);
    }

    // FIXED: Complete PENDING user logic from working middleware
    // If user is PENDING and accessing allowed routes, let them through
    if (
      userInfo.status === "PENDING" &&
      RouteGuard.isPendingUserAllowed(pathname)
    ) {
      return response;
    }

    // FIXED: Handle stale token data after status changes
    if (userInfo.status === "ACTIVE" && userInfo.isActive === false) {
      return response;
    }

    // FIXED: Complex inactive user checks
    if (
      userInfo.isActive === false &&
      !(
        userInfo.status === "PENDING" &&
        RouteGuard.isPendingUserAllowed(pathname)
      ) &&
      userInfo.status !== "ACTIVE"
    ) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Account disabled",
            message: "Your account has been disabled",
          },
          { status: 403 }
        );
      }

      const errorUrl = new URL("/oauth/error", req.url);
      errorUrl.searchParams.set("error", "AccountDisabled");
      return NextResponse.redirect(errorUrl);
    }

    // FIXED: Block PENDING users from accessing other protected routes
    if (
      userInfo.status === "PENDING" &&
      !RouteGuard.isPendingUserAllowed(pathname)
    ) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Account setup required",
            message: "Please complete your account setup",
          },
          { status: 403 }
        );
      }

      // FIXED: Redirect to /oauth/setup (not /signup/complete)
      const setupUrl = new URL("/oauth/setup", req.url);
      return NextResponse.redirect(setupUrl);
    }

    // FIXED: Dashboard protection for PENDING users
    if (pathname === "/dashboard") {
      if (userInfo.status === "PENDING") {
        const setupUrl = new URL("/oauth/setup", req.url);
        return NextResponse.redirect(setupUrl);
      }
    }

    return response;
  } catch (error) {
    // Don't catch NEXT_REDIRECT errors
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("Middleware auth error:", error);
    return AuthChecker.createErrorResponse(req, pathname);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
