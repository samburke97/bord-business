// middleware.ts - ENHANCED SECURITY - Priority 1 fixes without breaking functionality
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const startTime = Date.now();

  // Reduce logging in production
  if (process.env.NODE_ENV === "development") {
    console.log(`🔒 Middleware: Processing ${req.method} ${pathname}`);
  }

  // PRIORITY 1 FIX: Enhanced security headers with CSP and HSTS
  const response = NextResponse.next();

  // Core security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // PRIORITY 1: Content Security Policy - Carefully configured to maintain functionality
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://connect.facebook.net https://www.facebook.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://accounts.google.com https://www.facebook.com https://graph.facebook.com",
    "frame-src 'self' https://accounts.google.com https://www.facebook.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // PRIORITY 1: HSTS - Force HTTPS in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Additional security headers
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // ============================================================================
  // ALWAYS ALLOW: Authentication and public routes
  // ============================================================================

  const alwaysAllowRoutes = [
    "/login",
    "/api/auth", // ALL NextAuth routes
    "/auth", // ALL auth pages
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
    // Reduced logging for public routes
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

    // Only log for important routes in development
    const shouldLog =
      process.env.NODE_ENV === "development" &&
      !pathname.includes("/api/user/profile-status");

    if (shouldLog) {
      console.log(`🔐 Middleware: Token check for ${pathname}:`, {
        hasToken: !!token,
        userId: token?.sub,
      });
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
      if (shouldLog) {
        console.log(
          `❌ Middleware: Account disabled for user ${userInfo.email}`
        );
      }

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
    // PRIORITY 1: Sanitized error logging - no sensitive information
    console.error("❌ Middleware: Authentication error occurred");

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
