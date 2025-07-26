import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export interface UserInfo {
  userId: string;
  email: string;
  globalRole: string;
  isActive: boolean;
  isVerified: boolean;
  status: string;
}

export class AuthChecker {
  static async getUserInfo(req: NextRequest): Promise<UserInfo | null> {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) return null;

    return {
      userId: token.sub || "",
      email: token.email || "",
      globalRole: (token.globalRole as string) || "USER",
      isActive: (token.isActive as boolean) || false,
      isVerified: (token.isVerified as boolean) || false,
      status: (token.status as string) || "PENDING",
    };
  }

  static createUnauthorizedResponse(pathname: string): NextResponse {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", pathname);
    loginUrl.searchParams.set("return_to", pathname);
    return NextResponse.redirect(loginUrl);
  }

  static createErrorResponse(pathname: string): NextResponse {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Server error", message: "Authentication system error" },
        { status: 500 }
      );
    }

    const loginUrl = new URL("/login", pathname);
    loginUrl.searchParams.set("error", "SessionError");
    loginUrl.searchParams.set("return_to", pathname);
    return NextResponse.redirect(loginUrl);
  }
}
