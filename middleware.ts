// middleware.ts - FIXED COOKIE AND TOKEN READING
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

    // Try different cookie names that NextAuth might use
    const possibleTokens = [
      req.cookies.get("next-auth.session-token")?.value,
      req.cookies.get("__Secure-next-auth.session-token")?.value,
      req.cookies.get("__Host-next-auth.session-token")?.value,
    ].filter(Boolean);

    console.log(
      "🎫 Middleware: Possible session tokens found:",
      possibleTokens.length
    );

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      // Try different cookie names
      cookieName:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
    });

    console.log(`🔐 Middleware: Token check for ${pathname}:`, {
      hasToken: !!token,
      userId: token?.sub,
      email: token?.email,
      isActive: token?.isActive,
      globalRole: token?.globalRole,
      tokenKeys: token ? Object.keys(token) : [],
    });

    // If no token, handle differently for API vs page routes
    if (!token) {
      console.log(`❌ Middleware: No token found for ${pathname}`);

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

    // Check if user account is active
    if (token.isActive === false) {
      console.log(`❌ Middleware: Account disabled for user ${token.email}`);

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

    // Admin route protection
    const adminRoutes = [
      "/dashboard",
      "/admin",
      "/locations",
      "/activities",
      "/facilities",
      "/bookings",
      "/settings",
    ];

    // API routes that require admin access
    const adminApiRoutes = [
      "/api/admin",
      "/api/user/business-status", // This API requires authenticated user
      "/api/user/business", // This API requires authenticated user
    ];

    const isAdminRoute = adminRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isAdminApiRoute = adminApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isAdminRoute || isAdminApiRoute) {
      console.log(`🛡️ Middleware: Checking admin access for ${pathname}`);

      // Check for admin role (allow ADMIN and SUPER_ADMIN)
      if (token.globalRole !== "ADMIN" && token.globalRole !== "SUPER_ADMIN") {
        console.log(
          `❌ Middleware: Access denied - insufficient role (${token.globalRole}) for ${token.email}`
        );

        // For API routes, return 403 JSON response
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Access denied", message: "Insufficient permissions" },
            { status: 403 }
          );
        }

        // For page routes, redirect to error page
        const errorUrl = new URL("/auth/error", req.url);
        errorUrl.searchParams.set("error", "AccessDenied");
        return NextResponse.redirect(errorUrl);
      }

      console.log(
        `✅ Middleware: Admin access granted for ${token.email} (${token.globalRole})`
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
