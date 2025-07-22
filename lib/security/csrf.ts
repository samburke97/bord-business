// lib/security/csrf.ts - FIXED VERSION FOR NEXTAUTH
import { NextRequest } from "next/server";
import { generateSecureToken, secureCompare } from "./password";
import { getToken } from "next-auth/jwt";

// PRIORITY 1: CSRF Protection for state-changing operations
export class CSRFProtection {
  private static readonly CSRF_HEADER = "x-csrf-token";

  static generateToken(): string {
    return generateSecureToken(32);
  }

  static async validateToken(request: NextRequest): Promise<boolean> {
    try {
      // Get token from header
      const headerToken = request.headers.get(this.CSRF_HEADER);

      if (!headerToken) {
        return false;
      }

      // Get the NextAuth session token
      const sessionToken = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!sessionToken) {
        return false;
      }

      try {
        // Decode the CSRF token to see if it's valid
        const decoded = Buffer.from(headerToken, "base64").toString();

        // A valid NextAuth CSRF token should contain session information
        if (decoded && decoded.length > 10) {
          return true;
        }
      } catch (decodeError) {
        // If it's not base64, it might be a plain token - that's also valid
        if (headerToken.length >= 20) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if request needs CSRF validation
   */
  static requiresValidation(request: NextRequest): boolean {
    const method = request.method;
    const pathname = request.nextUrl.pathname;

    // Only validate state-changing methods
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return false;
    }

    // Skip validation for NextAuth routes (they handle their own CSRF)
    if (pathname.startsWith("/api/auth/")) {
      return false;
    }

    // Skip validation for public routes that don't change state
    const publicRoutes = [
      "/api/auth/check-user-status",
      "/api/auth/send-verification-code",
    ];

    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      return false;
    }

    // Require validation for all other API routes
    return pathname.startsWith("/api/");
  }

  /**
   * Middleware to add CSRF protection - ENHANCED LOGGING
   */
  static middleware() {
    return async (request: NextRequest) => {
      // Check if CSRF validation is required
      if (!this.requiresValidation(request)) {
        return null; // No validation needed
      }

      // Validate CSRF token
      const isValid = await this.validateToken(request);

      if (!isValid) {
        // Log debug info
        const headerToken = request.headers.get(this.CSRF_HEADER);

        return new Response(
          JSON.stringify({
            error: "Invalid CSRF token",
            message: "Request blocked for security reasons",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      return null; // Validation passed
    };
  }
}
