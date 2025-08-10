// middleware.ts - FIXED: Use EdgeAuthChecker instead of AuthChecker
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { SecurityHeaders } from "./lib/middleware/SecurityHeaders";
import { RouteGuard } from "./lib/middleware/RouteGuard";

// Edge-compatible UserInfo interface
interface UserInfo {
  userId: string;
  email: string;
  globalRole: string;
  isActive: boolean;
  isVerified: boolean;
  status: string;
}

// Edge-compatible AuthChecker that doesn't use getToken()
class EdgeAuthChecker {
  static async getUserInfo(req: NextRequest): Promise<UserInfo | null> {
    try {
      // Get session token from cookies (works in Edge Runtime)
      const sessionToken =
        req.cookies.get("next-auth.session-token")?.value ||
        req.cookies.get("__Secure-next-auth.session-token")?.value;

      if (!sessionToken) {
        return null;
      }

      // Manual JWT decode for Edge Runtime (since getToken() doesn't work)
      const secret = process.env.NEXTAUTH_SECRET;
      if (!secret) {
        console.error("NEXTAUTH_SECRET not available in Edge Runtime");
        return null;
      }

      // Simple JWT decode without verification (for Edge Runtime)
      try {
        const parts = sessionToken.split(".");
        if (parts.length !== 3) {
          return null;
        }

        // Decode the payload (middle part) using Web APIs
        const base64Payload = parts[1];
        // Add padding if needed
        const paddedPayload =
          base64Payload + "===".slice((base64Payload.length + 3) % 4);

        // Use atob for base64 decoding (available in Edge Runtime)
        const decodedPayload = atob(
          paddedPayload.replace(/-/g, "+").replace(/_/g, "/")
        );
        const payload = JSON.parse(decodedPayload);

        // Check if token is expired
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          return null;
        }

        return {
          userId: payload.sub || "",
          email: payload.email || "",
          globalRole: (payload.globalRole as string) || "USER",
          isActive: (payload.isActive as boolean) || false,
          isVerified: (payload.isVerified as boolean) || false,
          status: (payload.status as string) || "PENDING",
        };
      } catch (decodeError) {
        console.error("JWT decode failed:", decodeError);
        return null;
      }
    } catch (error) {
      console.error("Edge auth check failed:", error);
      return null;
    }
  }

  static createUnauthorizedResponse(
    req: NextRequest,
    pathname: string
  ): NextResponse {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("return_to", pathname);
    return NextResponse.redirect(loginUrl);
  }

  static createErrorResponse(req: NextRequest, pathname: string): NextResponse {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Server error", message: "Authentication system error" },
        { status: 500 }
      );
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "SessionError");
    loginUrl.searchParams.set("return_to", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const response = NextResponse.next();

  try {
    // Apply security headers
    SecurityHeaders.apply(response);

    // FIXED: Use EdgeAuthChecker instead of AuthChecker
    const userInfo = await EdgeAuthChecker.getUserInfo(req);

    // BLOCK: ACTIVE users from accessing signup routes
    if (
      userInfo &&
      userInfo.status === "ACTIVE" &&
      pathname.startsWith("/signup/")
    ) {
      const dashboardUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(dashboardUrl);
    }

    // Check if route needs authentication
    if (!RouteGuard.requiresAuthentication(pathname)) {
      return response;
    }

    if (!userInfo) {
      return EdgeAuthChecker.createUnauthorizedResponse(req, pathname);
    }

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
    return EdgeAuthChecker.createErrorResponse(req, pathname);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
