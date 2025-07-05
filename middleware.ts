// middleware.ts - COMPLETE FIXED FOR DATABASE SESSIONS
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const startTime = Date.now();

  console.log(`🔒 Middleware: Processing ${req.method} ${pathname}`);

  // Apply basic security headers
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // ============================================================================
  // ALWAYS ALLOW: Authentication and public routes
  // ============================================================================

  const alwaysAllowRoutes = [
    "/login",
    "/api/auth", // ALL NextAuth routes and custom auth routes
    "/auth", // ALL auth pages
    "/business-onboarding", // Allow business onboarding
    "/_next",
    "/favicon.ico",
    "/icons",
    "/images",
    "/public",
  ];

  // Check if route should always be allowed
  const isAlwaysAllowed = alwaysAllowRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isAlwaysAllowed) {
    console.log(`✅ Middleware: Allowing public route ${pathname}`);
    return response;
  }

  // ============================================================================
  // PROTECTED ROUTES: Require authentication
  // ============================================================================

  try {
    // DEBUG: Log all cookies to see what's available
    console.log("🍪 Middleware: Available cookies:", {
      cookieHeader: req.headers.get("cookie"),
      cookies: Object.fromEntries(
        req.cookies
          .getAll()
          .map((cookie) => [cookie.name, cookie.value.substring(0, 20) + "..."])
      ),
    });

    // ============================================================================
    // FIX: For database sessions, check for the session token cookie directly
    // ============================================================================

    const sessionToken = req.cookies.get("next-auth.session-token")?.value;

    console.log("🎫 Middleware: Session token check:", {
      hasSessionToken: !!sessionToken,
      tokenLength: sessionToken?.length || 0,
    });

    // If no session token, user is not authenticated
    if (!sessionToken) {
      console.log(`❌ Middleware: No session token found for ${pathname}`);

      // For API routes, return 401 JSON response
      if (pathname.startsWith("/api/")) {
        console.log(`🔒 Middleware: Returning 401 for API route ${pathname}`);
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        );
      }

      // For page routes, redirect to login
      console.log(
        `🔒 Middleware: Redirecting to login for page route ${pathname}`
      );
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("return_to", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ============================================================================
    // For database strategy, we'll get user info from getToken as fallback
    // This is mainly for role checking and additional validation
    // ============================================================================

    let userInfo = null;

    try {
      // Try to get token info (this works even with database strategy for some fields)
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: "next-auth.session-token",
      });

      if (token) {
        userInfo = {
          userId: token.sub,
          email: token.email,
          globalRole: token.globalRole,
          isActive: token.isActive,
          isVerified: token.isVerified,
        };
      }
    } catch (tokenError) {
      console.warn("⚠️ Middleware: Could not get token info:", tokenError);
      // Continue without token info - session token exists so user is authenticated
    }

    console.log(`🔐 Middleware: User info for ${pathname}:`, {
      hasSessionToken: !!sessionToken,
      hasUserInfo: !!userInfo,
      userId: userInfo?.userId,
      email: userInfo?.email,
      globalRole: userInfo?.globalRole,
      isActive: userInfo?.isActive,
    });

    // ============================================================================
    // Check if user account is active (if we have this info)
    // ============================================================================
    if (userInfo && userInfo.isActive === false) {
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
    const adminRoutes = [
      "/dashboard",
      "/admin",
      "/locations",
      "/activities",
      "/facilities",
      "/bookings",
      "/settings",
    ];

    // API routes that require authenticated user (not necessarily admin)
    const authApiRoutes = ["/api/user/business-status", "/api/user/business"];

    // API routes that require admin access
    const adminApiRoutes = ["/api/admin"];

    const isAdminRoute = adminRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isAuthApiRoute = authApiRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isAdminApiRoute = adminApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // For admin routes, check role if we have user info
    if (isAdminRoute && userInfo) {
      console.log(`🛡️ Middleware: Checking admin access for ${pathname}`);

      // Check for admin role (allow ADMIN and SUPER_ADMIN)
      if (
        userInfo.globalRole !== "ADMIN" &&
        userInfo.globalRole !== "SUPER_ADMIN"
      ) {
        console.log(
          `❌ Middleware: Access denied - insufficient role (${userInfo.globalRole}) for ${userInfo.email}`
        );

        // For page routes, redirect to error page
        const errorUrl = new URL("/auth/error", req.url);
        errorUrl.searchParams.set("error", "AccessDenied");
        return NextResponse.redirect(errorUrl);
      }

      console.log(
        `✅ Middleware: Admin access granted for ${userInfo.email} (${userInfo.globalRole})`
      );
    }

    // For admin API routes, check role if we have user info
    if (isAdminApiRoute && userInfo) {
      if (
        userInfo.globalRole !== "ADMIN" &&
        userInfo.globalRole !== "SUPER_ADMIN"
      ) {
        return NextResponse.json(
          { error: "Access denied", message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    // For authenticated API routes, we just need a valid session token (which we already checked)
    if (isAuthApiRoute) {
      console.log(
        `✅ Middleware: Authenticated API access granted for ${pathname}`
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Middleware: Request processed in ${processingTime}ms`);

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
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
