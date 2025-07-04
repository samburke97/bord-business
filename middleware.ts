// middleware.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/api/auth",
    "/auth/error",
    "/auth/verify-request",
    "/auth/password",
    "/auth/verify-email",
    "/auth/setup",
    "/auth/congratulations",
    "/auth/forgot-password", // For forgot password form
    "/forgot-password", // For forgot password sent page
    "/auth/reset-password", // ADD THIS LINE - for reset password form
    "/reset-password", // ADD THIS LINE - for reset password routes
    "/verify-email",
    "/business-onboarding", // Make business onboarding public temporarily for testing
    "/_next",
    "/favicon.ico",
    "/icons",
    "/images",
  ];

  // Check if the current path is in the public routes
  const isPublicRoute = publicRoutes.some(
    (route) =>
      req.nextUrl.pathname.startsWith(route) || req.nextUrl.pathname === route
  );

  // Skip middleware for public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Simplified token extraction
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("return_to", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Allow authenticated users to access business onboarding
    if (req.nextUrl.pathname.startsWith("/business-onboarding")) {
      return NextResponse.next();
    }

    // Check for admin role if accessing admin-only routes
    const isAdminRoute =
      req.nextUrl.pathname.startsWith("/dashboard") ||
      req.nextUrl.pathname.startsWith("/protected-route") ||
      req.nextUrl.pathname.startsWith("/locations") ||
      req.nextUrl.pathname.startsWith("/activities") ||
      req.nextUrl.pathname.startsWith("/facilities");

    if (
      isAdminRoute &&
      token.role !== "ADMIN" &&
      token.role !== "SUPER_ADMIN"
    ) {
      // Redirect to login for unauthorized access
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("return_to", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware authentication error:", error);
    // Handle errors gracefully - redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "AuthError");
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
