// lib/security/csrf.ts - CSRF Protection Implementation
import { NextRequest } from "next/server";
import { generateSecureToken, secureCompare } from "./password";

// PRIORITY 1: CSRF Protection for state-changing operations
export class CSRFProtection {
  private static readonly CSRF_HEADER = "x-csrf-token";
  private static readonly CSRF_COOKIE = "csrf-token";

  /**
   * Generate a CSRF token for a session
   */
  static generateToken(): string {
    return generateSecureToken(32);
  }

  /**
   * Validate CSRF token from request
   */
  static async validateToken(request: NextRequest): Promise<boolean> {
    try {
      // Get token from header
      const headerToken = request.headers.get(this.CSRF_HEADER);

      // Get token from cookie (NextAuth handles CSRF for auth routes)
      const cookieToken = request.cookies.get("next-auth.csrf-token")?.value;

      if (!headerToken || !cookieToken) {
        return false;
      }

      // Use timing-safe comparison
      return secureCompare(headerToken, cookieToken);
    } catch (error) {
      console.error("CSRF validation error");
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
   * Middleware to add CSRF protection
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
        console.warn(
          `CSRF validation failed for ${request.method} ${request.nextUrl.pathname}`
        );

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
