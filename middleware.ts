// middleware.ts - MINIMAL WORKING VERSION
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

  // ============================================================================
  // ALWAYS ALLOW: Authentication and public routes
  // ============================================================================

  const alwaysAllowRoutes = [
    "/login",
    "/api/auth", // ALL NextAuth routes and custom auth routes
    "/auth", // ALL auth pages
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

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("return_to", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user account is active
    if (token.isActive === false) {
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

    const isAdminRoute = adminRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isAdminRoute) {
      // Check for admin role
      if (token.globalRole !== "ADMIN" && token.globalRole !== "SUPER_ADMIN") {
        const errorUrl = new URL("/auth/error", req.url);
        errorUrl.searchParams.set("error", "AccessDenied");
        return NextResponse.redirect(errorUrl);
      }
    }

    return response;
  } catch (error) {
    console.error("Middleware error:", error);

    // On error, redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "SessionError");
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
