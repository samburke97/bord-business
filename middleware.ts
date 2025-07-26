// middleware.ts - QUICK FIX: Restore working version without modular imports
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const response = NextResponse.next();

  // Core security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // CSP for reCAPTCHA and Mapbox support
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://connect.facebook.net https://www.facebook.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://api.mapbox.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.google.com https://www.gstatic.com https://api.mapbox.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob: https://api.mapbox.com https://*.tiles.mapbox.com",
    "connect-src 'self' https://accounts.google.com https://www.facebook.com https://graph.facebook.com https://www.google.com https://www.recaptcha.net https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com",
    "frame-src 'self' https://accounts.google.com https://www.facebook.com https://www.google.com https://www.recaptcha.net https://recaptcha.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // HSTS in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Public routes that don't need authentication
  const alwaysAllowRoutes = [
    "/login",
    "/api/auth/",
    "/api/auth/signin",
    "/api/auth/callback",
    "/api/auth/callback/facebook",
    "/api/auth/callback/google",
    "/api/auth/session",
    "/api/auth/csrf",
    "/api/auth/providers",
    "/api/auth/check-user-status",
    "/password/",
    "/signup/",
    "/oauth/",
    "/_next",
    "/favicon.ico",
    "/icons",
    "/images",
    "/public",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".ico",
  ];

  // Check if route is public
  const isAlwaysAllowed = alwaysAllowRoutes.some((route) => {
    if (route.endsWith("/")) {
      return pathname.startsWith(route);
    } else if (route.startsWith(".")) {
      return pathname.endsWith(route);
    } else {
      return pathname === route || pathname.startsWith(route + "/");
    }
  });

  if (isAlwaysAllowed) {
    return response;
  }

  // Protected routes - require authentication
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // No token = not authenticated
    if (!token) {
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

    // User is authenticated - check additional permissions
    const userInfo = {
      userId: token.sub,
      email: token.email,
      globalRole: token.globalRole,
      isActive: token.isActive,
      isVerified: token.isVerified,
      status: token.status,
    };

    // PENDING user routes
    const allowedForPendingUsers = [
      "/api/user/activate-profile",
      "/api/user/profile-status",
      "/api/user/business-status",
      "/api/auth/check-username",
      "/signup/complete",
      "/oauth/setup",
      "/",
    ];

    const isPendingUserAllowedRoute = allowedForPendingUsers.some((route) =>
      pathname.startsWith(route)
    );

    // If user is PENDING and accessing allowed routes, let them through
    if (userInfo.status === "PENDING" && isPendingUserAllowedRoute) {
      return response;
    }

    // Handle stale token data after status changes
    if (userInfo.status === "ACTIVE" && userInfo.isActive === false) {
      return response;
    }

    // Check if user account is active
    if (
      userInfo.isActive === false &&
      !(userInfo.status === "PENDING" && isPendingUserAllowedRoute) &&
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
    if (userInfo.status === "PENDING" && !isPendingUserAllowedRoute) {
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
