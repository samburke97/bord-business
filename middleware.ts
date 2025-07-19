// middleware.ts - CORRECTED: No Database Queries in Edge Runtime
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

  // PRIORITY 1: Content Security Policy - Updated to support reCAPTCHA
  const csp = [
    "default-src 'self'",
    // Script sources - include Google reCAPTCHA domains and Mapbox
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://connect.facebook.net https://www.facebook.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://api.mapbox.com",
    // Style sources - include Google Fonts, reCAPTCHA, and Mapbox
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.google.com https://www.gstatic.com https://api.mapbox.com",
    // Font sources
    "font-src 'self' https://fonts.gstatic.com data:",
    // Image sources - include Google domains and Mapbox tiles
    "img-src 'self' data: https: blob: https://api.mapbox.com https://*.tiles.mapbox.com",
    // Connect sources - include Google reCAPTCHA API and Mapbox API
    "connect-src 'self' https://accounts.google.com https://www.facebook.com https://graph.facebook.com https://www.google.com https://www.recaptcha.net https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com",
    // Frame sources - include Google reCAPTCHA and social login
    "frame-src 'self' https://accounts.google.com https://www.facebook.com https://www.google.com https://www.recaptcha.net https://recaptcha.google.com",
    // Worker sources - allow blob URLs for Mapbox workers
    "worker-src 'self' blob:",
    // Object and form sources
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
  // CRITICAL FIX: More comprehensive authentication route exclusions
  // ============================================================================

  const alwaysAllowRoutes = [
    "/login",
    "/api/auth/", // CRITICAL: Must include trailing slash for all NextAuth routes
    "/api/auth/signin",
    "/api/auth/callback", // CRITICAL: All OAuth callbacks
    "/api/auth/callback/facebook", // Specific Facebook callback
    "/api/auth/callback/google", // Specific Google callback
    "/api/auth/session",
    "/api/auth/csrf",
    "/api/auth/providers",
    "/api/auth/check-user-status", // CRITICAL: Allow user status check for login flow
    "/auth/", // ALL auth pages (including /auth/setup, /auth/password, etc.)
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

  // CRITICAL FIX: Better route matching logic
  const isAlwaysAllowed = alwaysAllowRoutes.some((route) => {
    if (route.endsWith("/")) {
      // For routes ending with slash, check if pathname starts with route
      return pathname.startsWith(route);
    } else if (route.startsWith(".")) {
      // For file extensions, check if pathname ends with extension
      return pathname.endsWith(route);
    } else {
      // For exact routes, check exact match or starts with route + slash
      return pathname === route || pathname.startsWith(route + "/");
    }
  });

  if (isAlwaysAllowed) {
    // CRITICAL: Always allow OAuth callback processing
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ Middleware: Allowing route ${pathname}`);
    }
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

    // No token = not authenticated
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
    // ADMIN ROUTE PROTECTION
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
    if (isAdminApiRoute) {
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
    if (isAdminOnlyRoute) {
      if (
        userInfo.globalRole !== "ADMIN" &&
        userInfo.globalRole !== "SUPER_ADMIN"
      ) {
        const errorUrl = new URL("/auth/error", req.url);
        errorUrl.searchParams.set("error", "AccessDenied");
        return NextResponse.redirect(errorUrl);
      }
    }

    // User passed all checks
    if (shouldLog) {
      console.log(`✅ Middleware: Access granted to ${pathname}`);
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
