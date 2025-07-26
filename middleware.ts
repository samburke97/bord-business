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

    // Handle pending users
    if (
      userInfo.status === "PENDING" &&
      !RouteGuard.isPendingUserAllowed(pathname)
    ) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Account Setup Required",
            message: "Please complete your account setup",
            redirect: "/signup/complete",
          },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/signup/complete", req.url));
    }

    // Handle inactive users
    if (!userInfo.isActive && pathname !== "/") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Account Inactive",
            message: "Your account has been deactivated",
          },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/", req.url));
    }

    return response;
  } catch (error) {
    console.error("Middleware auth error:", error);
    return AuthChecker.createErrorResponse(req, pathname);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
