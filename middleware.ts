import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { RouteGuard } from "@/lib/middleware/RouteGuard";
import { SecurityHeaders } from "@/lib/middleware/SecurityHeaders";
import { AuthChecker } from "@/lib/middleware/AuthChecker";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const response = NextResponse.next();

  // Apply security headers
  SecurityHeaders.apply(response);

  // Check if route requires authentication
  if (!RouteGuard.requiresAuthentication(pathname)) {
    return response;
  }

  try {
    // Get user info
    const userInfo = await AuthChecker.getUserInfo(req);

    // No authentication
    if (!userInfo) {
      return AuthChecker.createUnauthorizedResponse(pathname);
    }

    // Handle PENDING users
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
      return NextResponse.redirect(new URL("/oauth/setup", req.url));
    }

    // Dashboard protection for PENDING users
    if (pathname === "/dashboard" && userInfo.status === "PENDING") {
      return NextResponse.redirect(new URL("/oauth/setup", req.url));
    }

    // Handle inactive accounts
    if (!userInfo.isActive && userInfo.status !== "ACTIVE") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Account disabled",
            message: "Your account has been disabled",
          },
          { status: 403 }
        );
      }
      return NextResponse.redirect(
        new URL("/oauth/error?error=AccountDisabled", req.url)
      );
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }

    return AuthChecker.createErrorResponse(pathname);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
