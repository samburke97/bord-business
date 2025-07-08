// middleware.ts - FIXED - Reduced logging and better route protection
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Apply basic security headers
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // ============================================================================
  // ALWAYS ALLOW: Authentication and public routes (NO LOGGING)
  // ============================================================================

  const alwaysAllowRoutes = [
    "/login",
    "/api/auth", // ALL NextAuth routes
    "/auth", // ALL auth pages including /auth/setup
    "/verify-email",
    "/_next",
    "/favicon.ico",
    "/icons",
    "/images",
    "/public",
    ".svg", // Allow SVG files
    ".png", // Allow PNG files
    ".jpg", // Allow JPG files
    ".jpeg", // Allow JPEG files
    ".ico", // Allow ICO files
  ];

  // Check if route should always be allowed
  const isAlwaysAllowed = alwaysAllowRoutes.some(
    (route) => pathname.startsWith(route) || pathname.endsWith(route)
  );

  if (isAlwaysAllowed) {
    // NO LOGGING for public routes - reduces noise
    return response;
  }

  // ============================================================================
  // PROTECTED ROUTES: Require authentication
  // ============================================================================

  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Only log for important routes, not API status checks
    const shouldLog = !pathname.includes("/api/user/profile-status");

    if (shouldLog) {
      console.log(`🔒 Middleware: Processing ${req.method} ${pathname}`);
    }

    if (!token) {
      if (shouldLog) {
        console.log(`❌ Middleware: No valid token found for ${pathname}`);
      }

      // For API routes, return 401 JSON response
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        );
      }

      // For page routes, redirect to login
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("return_to", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // User is authenticated - check additional permissions
    const userInfo = {
      userId: token.sub,
      email: token.email,
      globalRole: token.globalRole,
      isActive: token.isActive,
      isVerified: token.isVerified,
    };

    // Check if user account is active
    if (userInfo.isActive === false) {
      console.log(`❌ Middleware: Account disabled for user ${userInfo.email}`);

      // For API routes, return 403 JSON response
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Account disabled",
            message: "Your account has been disabled",
          },
          { status: 403 }
        );
      }

      // For page routes, redirect to error page
      const errorUrl = new URL("/auth/error", req.url);
      errorUrl.searchParams.set("error", "AccountDisabled");
      return NextResponse.redirect(errorUrl);
    }

    // ============================================================================
    // Admin route protection
    // ============================================================================

    const adminApiRoutes = ["/api/admin"];
    const adminOnlyRoutes = ["/admin", "/system-settings", "/user-management"];

    const isAdminApiRoute = adminApiRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isAdminOnlyRoute = adminOnlyRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // For admin API routes, check role
    if (isAdminApiRoute && userInfo) {
      if (
        userInfo.globalRole !== "ADMIN" &&
        userInfo.globalRole !== "SUPER_ADMIN"
      ) {
        return NextResponse.json(
          { error: "Access denied", message: "Admin privileges required" },
          { status: 403 }
        );
      }
    }

    // For admin-only routes, check role
    if (isAdminOnlyRoute && userInfo) {
      if (
        userInfo.globalRole !== "ADMIN" &&
        userInfo.globalRole !== "SUPER_ADMIN"
      ) {
        const errorUrl = new URL("/auth/error", req.url);
        errorUrl.searchParams.set("error", "AccessDenied");
        return NextResponse.redirect(errorUrl);
      }
    }

    return response;
  } catch (error) {
    console.error("❌ Middleware: Critical error:", error);

    // For API routes, return 500 JSON response
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Server error", message: "Authentication system error" },
        { status: 500 }
      );
    }

    // For page routes, redirect to login with error context
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "SessionError");
    loginUrl.searchParams.set("return_to", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
