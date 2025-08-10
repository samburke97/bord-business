// // middleware.ts - Edge Runtime compatible version
// import { NextResponse } from "next/server";
// import { NextRequest } from "next/server";
// import { SecurityHeaders } from "./lib/middleware/SecurityHeaders";
// import { EdgeAuthChecker } from "./lib/middleware/EdgeAuthChecker";
// import { RouteGuard } from "./lib/middleware/RouteGuard";

// export async function middleware(req: NextRequest) {
//   const pathname = req.nextUrl.pathname;
//   const response = NextResponse.next();

//   // Apply security headers (including fixed CSP)
//   SecurityHeaders.apply(response);

//   // Get user info for ALL routes (including public ones) to check ACTIVE user status
//   try {
//     // FIXED: Use EdgeAuthChecker instead of AuthChecker for Vercel Edge compatibility
//     const userInfo = await EdgeAuthChecker.getUserInfo(req);

//     // BLOCK: ACTIVE users from accessing signup routes
//     if (
//       userInfo &&
//       userInfo.status === "ACTIVE" &&
//       pathname.startsWith("/signup/")
//     ) {
//       const dashboardUrl = new URL("/dashboard", req.url);
//       return NextResponse.redirect(dashboardUrl);
//     }

//     // Check if route needs authentication
//     if (!RouteGuard.requiresAuthentication(pathname)) {
//       return response;
//     }

//     if (!userInfo) {
//       return EdgeAuthChecker.createUnauthorizedResponse(req, pathname);
//     }

//     // FIXED: Complete PENDING user logic from working middleware
//     // If user is PENDING and accessing allowed routes, let them through
//     if (
//       userInfo.status === "PENDING" &&
//       RouteGuard.isPendingUserAllowed(pathname)
//     ) {
//       return response;
//     }

//     // FIXED: Handle stale token data after status changes
//     if (userInfo.status === "ACTIVE" && userInfo.isActive === false) {
//       return response;
//     }

//     // FIXED: Complex inactive user checks
//     if (
//       userInfo.isActive === false &&
//       !(
//         userInfo.status === "PENDING" &&
//         RouteGuard.isPendingUserAllowed(pathname)
//       ) &&
//       userInfo.status !== "ACTIVE"
//     ) {
//       if (pathname.startsWith("/api/")) {
//         return NextResponse.json(
//           {
//             error: "Account disabled",
//             message: "Your account has been disabled",
//           },
//           { status: 403 }
//         );
//       }

//       const errorUrl = new URL("/oauth/error", req.url);
//       errorUrl.searchParams.set("error", "AccountDisabled");
//       return NextResponse.redirect(errorUrl);
//     }

//     // FIXED: Block PENDING users from accessing other protected routes
//     if (
//       userInfo.status === "PENDING" &&
//       !RouteGuard.isPendingUserAllowed(pathname)
//     ) {
//       if (pathname.startsWith("/api/")) {
//         return NextResponse.json(
//           {
//             error: "Account setup required",
//             message: "Please complete your account setup",
//           },
//           { status: 403 }
//         );
//       }

//       // FIXED: Redirect to /oauth/setup (not /signup/complete)
//       const setupUrl = new URL("/oauth/setup", req.url);
//       return NextResponse.redirect(setupUrl);
//     }

//     // FIXED: Dashboard protection for PENDING users
//     if (pathname === "/dashboard") {
//       if (userInfo.status === "PENDING") {
//         const setupUrl = new URL("/oauth/setup", req.url);
//         return NextResponse.redirect(setupUrl);
//       }
//     }

//     return response;
//   } catch (error) {
//     // Don't catch NEXT_REDIRECT errors
//     if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
//       throw error;
//     }

//     console.error("Middleware auth error:", error);
//     return EdgeAuthChecker.createErrorResponse(req, pathname);
//   }
// }

// export const config = {
//   matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
// };

// middleware.ts - MINIMAL Edge Runtime version with ZERO Node.js dependencies
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

interface UserInfo {
  userId: string;
  email: string;
  globalRole: string;
  isActive: boolean;
  isVerified: boolean;
  status: string;
}

// Inline minimal functions to avoid any imports that might use Node.js APIs
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    "/login",
    "/api/auth/",
    "/password/",
    "/signup/",
    "/oauth/",
    "/_next",
    "/favicon.ico",
    "/icons",
    "/images",
    "/public",
  ];

  return publicRoutes.some((route) => {
    if (route.endsWith("/")) {
      return pathname.startsWith(route);
    }
    return pathname === route || pathname.startsWith(route + "/");
  });
}

function isPendingUserAllowed(pathname: string): boolean {
  const pendingRoutes = [
    "/api/user/activate-profile",
    "/api/user/profile-status",
    "/api/user/business-status",
    "/signup/complete",
    "/oauth/setup",
    "/",
  ];

  return pendingRoutes.some((route) => pathname.startsWith(route));
}

function applySecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

async function getUserInfo(req: NextRequest): Promise<UserInfo | null> {
  try {
    // Get session token from cookies (Edge Runtime compatible)
    const sessionToken =
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      return null;
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("NEXTAUTH_SECRET not available");
      return null;
    }

    // Manual JWT decode using ONLY Web APIs
    try {
      const parts = sessionToken.split(".");
      if (parts.length !== 3) {
        return null;
      }

      // Decode payload using globalThis.atob (Edge Runtime compatible)
      const base64Payload = parts[1];
      const paddedPayload =
        base64Payload + "===".slice((base64Payload.length + 3) % 4);

      const decodedPayload = globalThis.atob(
        paddedPayload.replace(/-/g, "+").replace(/_/g, "/")
      );
      const payload = JSON.parse(decodedPayload);

      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }

      return {
        userId: payload.sub || "",
        email: payload.email || "",
        globalRole: payload.globalRole || "USER",
        isActive: payload.isActive || false,
        isVerified: payload.isVerified || false,
        status: payload.status || "PENDING",
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

function createUnauthorizedResponse(
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

function createErrorResponse(req: NextRequest, pathname: string): NextResponse {
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

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const response = NextResponse.next();

  try {
    // Apply basic security headers
    applySecurityHeaders(response);

    // Get user info
    const userInfo = await getUserInfo(req);

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
    if (isPublicRoute(pathname)) {
      return response;
    }

    if (!userInfo) {
      return createUnauthorizedResponse(req, pathname);
    }

    // PENDING user allowed routes
    if (userInfo.status === "PENDING" && isPendingUserAllowed(pathname)) {
      return response;
    }

    // Handle stale token data after status changes
    if (userInfo.status === "ACTIVE" && userInfo.isActive === false) {
      return response;
    }

    // Complex inactive user checks
    if (
      userInfo.isActive === false &&
      !(userInfo.status === "PENDING" && isPendingUserAllowed(pathname)) &&
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

    // Block PENDING users from accessing other protected routes
    if (userInfo.status === "PENDING" && !isPendingUserAllowed(pathname)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Account setup required",
            message: "Please complete your account setup",
          },
          { status: 403 }
        );
      }

      const setupUrl = new URL("/oauth/setup", req.url);
      return NextResponse.redirect(setupUrl);
    }

    // Dashboard protection for PENDING users
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
    return createErrorResponse(req, pathname);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
