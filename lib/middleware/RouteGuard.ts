import { NextRequest } from "next/server";

export class RouteGuard {
  private static readonly PUBLIC_ROUTES = [
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
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".ico",
  ];

  private static readonly PENDING_USER_ROUTES = [
    "/api/user/activate-profile",
    "/api/user/profile-status",
    "/api/user/business-status",
    "/api/auth/check-username",
    "/signup/complete",
    "/oauth/setup",
    "/",
  ];

  static isPublicRoute(pathname: string): boolean {
    return this.PUBLIC_ROUTES.some((route) => {
      if (route.endsWith("/")) {
        return pathname.startsWith(route);
      } else if (route.startsWith(".")) {
        return pathname.endsWith(route);
      } else {
        return pathname === route || pathname.startsWith(route + "/");
      }
    });
  }

  static isPendingUserAllowed(pathname: string): boolean {
    return this.PENDING_USER_ROUTES.some((route) => pathname.startsWith(route));
  }

  static requiresAuthentication(pathname: string): boolean {
    return !this.isPublicRoute(pathname);
  }
}
