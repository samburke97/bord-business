import { NextResponse } from "next/server";

export class SecurityHeaders {
  static apply(response: NextResponse): void {
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://connect.facebook.net https://www.recaptcha.net https://api.mapbox.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob: https://api.mapbox.com https://*.tiles.mapbox.com",
      "connect-src 'self' https://accounts.google.com https://www.recaptcha.net https://api.mapbox.com",
      "frame-src 'self' https://accounts.google.com https://www.recaptcha.net",
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
  }
}
