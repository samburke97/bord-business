// lib/middleware/EdgeAuthChecker.ts - Edge Runtime compatible version
import { NextRequest, NextResponse } from "next/server";

export interface UserInfo {
  userId: string;
  email: string;
  globalRole: string;
  isActive: boolean;
  isVerified: boolean;
  status: string;
}

export class EdgeAuthChecker {
  static async getUserInfo(req: NextRequest): Promise<UserInfo | null> {
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
        console.error("NEXTAUTH_SECRET not available in Edge Runtime");
        return null;
      }

      // Manual JWT decode for Edge Runtime (since getToken() doesn't work)
      try {
        const parts = sessionToken.split(".");
        if (parts.length !== 3) {
          return null;
        }

        // Decode the payload (middle part) using Web APIs only
        const base64Payload = parts[1];
        // Add padding if needed for base64 decoding
        const paddedPayload =
          base64Payload + "===".slice((base64Payload.length + 3) % 4);

        // Use globalThis.atob for base64 decoding (available in Edge Runtime)
        const decodedPayload = globalThis.atob(
          paddedPayload.replace(/-/g, "+").replace(/_/g, "/")
        );
        const payload = JSON.parse(decodedPayload);

        // Check if token is expired
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          return null;
        }

        return {
          userId: payload.sub || "",
          email: payload.email || "",
          globalRole: (payload.globalRole as string) || "USER",
          isActive: (payload.isActive as boolean) || false,
          isVerified: (payload.isVerified as boolean) || false,
          status: (payload.status as string) || "PENDING",
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

  static createUnauthorizedResponse(
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

  static createErrorResponse(req: NextRequest, pathname: string): NextResponse {
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
