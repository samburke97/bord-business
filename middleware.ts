// // middleware.ts - COMPLETELY FIXED - Replace your entire file with this
// import { NextResponse } from "next/server";
// import { NextRequest } from "next/server";
// import { SecurityHeaders } from "./lib/middleware/SecurityHeaders";
// import { AuthChecker } from "./lib/middleware/AuthChecker";
// import { RouteGuard } from "./lib/middleware/RouteGuard";

// export async function middleware(req: NextRequest) {
//   const pathname = req.nextUrl.pathname;
//   const response = NextResponse.next();

//   SecurityHeaders.apply(response);

//   // Get user info for ALL routes (including public ones) to check ACTIVE user status
//   try {
//     const userInfo = await AuthChecker.getUserInfo(req);

//     // BLOCK: ACTIVE users from accessing signup routes
//     if (
//       userInfo &&
//       userInfo.status === "ACTIVE" &&
//       pathname.startsWith("/signup/")
//     ) {
//       const dashboardUrl = new URL("/dashboard", req.url);
//       return NextResponse.redirect(dashboardUrl);
//     }

//     // Check if route needs authentication
//     if (!RouteGuard.requiresAuthentication(pathname)) {
//       return response;
//     }

//     if (!userInfo) {
//       return AuthChecker.createUnauthorizedResponse(req, pathname);
//     }

//     if (
//       userInfo.status === "PENDING" &&
//       RouteGuard.isPendingUserAllowed(pathname)
//     ) {
//       return response;
//     }

//     // FIXED: Handle stale token data after status changes
//     if (userInfo.status === "ACTIVE" && userInfo.isActive === false) {
//       return response;
//     }

//     // FIXED: Complex inactive user checks - SYNTAX ERROR CORRECTED
//     if (
//       userInfo.isActive === false &&
//       !(
//         userInfo.status === "PENDING" &&
//         RouteGuard.isPendingUserAllowed(pathname)
//       ) &&
//       userInfo.status !== "ACTIVE"
//     ) {
//       if (pathname.startsWith("/api/")) {
//         return NextResponse.json(
//           {
//             error: "Account disabled",
//             message: "Your account has been disabled",
//           },
//           { status: 403 }
//         );
//       }

//       const errorUrl = new URL("/oauth/error", req.url);
//       errorUrl.searchParams.set("error", "AccountDisabled");
//       return NextResponse.redirect(errorUrl);
//     }

//     // FIXED: Block PENDING users from accessing other protected routes
//     if (
//       userInfo.status === "PENDING" &&
//       !RouteGuard.isPendingUserAllowed(pathname)
//     ) {
//       if (pathname.startsWith("/api/")) {
//         return NextResponse.json(
//           {
//             error: "Account setup required",
//             message: "Please complete your account setup",
//           },
//           { status: 403 }
//         );
//       }

//       // FIXED: Redirect to /oauth/setup (not /signup/complete)
//       const setupUrl = new URL("/oauth/setup", req.url);
//       return NextResponse.redirect(setupUrl);
//     }

//     // FIXED: Dashboard protection for PENDING users
//     if (pathname === "/dashboard") {
//       if (userInfo.status === "PENDING") {
//         const setupUrl = new URL("/oauth/setup", req.url);
//         return NextResponse.redirect(setupUrl);
//       }
//     }

//     return response;
//   } catch (error) {
//     // Don't catch NEXT_REDIRECT errors
//     if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
//       throw error;
//     }

//     console.error("Middleware auth error:", error);
//     return AuthChecker.createErrorResponse(req, pathname);
//   }
// }

// export const config = {
//   matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
// };

// middleware.ts - STEP-BY-STEP DEBUG VERSION
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  console.log("🚀 Step-by-step middleware for:", req.nextUrl.pathname);

  try {
    const response = NextResponse.next();

    // STEP 1: Test SecurityHeaders import
    console.log("📝 Testing SecurityHeaders import...");
    try {
      const { SecurityHeaders } = await import(
        "./lib/middleware/SecurityHeaders"
      );
      console.log("✅ SecurityHeaders imported successfully");

      // Test applying headers
      SecurityHeaders.apply(response);
      console.log("✅ SecurityHeaders applied successfully");
    } catch (error) {
      console.error("❌ SecurityHeaders error:", error);
      throw new Error("SecurityHeaders failed");
    }

    // STEP 2: Test RouteGuard import
    console.log("🚦 Testing RouteGuard import...");
    try {
      const { RouteGuard } = await import("./lib/middleware/RouteGuard");
      console.log("✅ RouteGuard imported successfully");

      // Test route checking
      const isPublic = RouteGuard.requiresAuthentication(req.nextUrl.pathname);
      console.log("✅ RouteGuard.requiresAuthentication:", !isPublic);
    } catch (error) {
      console.error("❌ RouteGuard error:", error);
      throw new Error("RouteGuard failed");
    }

    // STEP 3: Test AuthChecker import (but don't call getUserInfo yet)
    console.log("🔐 Testing AuthChecker import...");
    try {
      const { AuthChecker } = await import("./lib/middleware/AuthChecker");
      console.log("✅ AuthChecker imported successfully");
    } catch (error) {
      console.error("❌ AuthChecker import error:", error);
      throw new Error("AuthChecker import failed");
    }

    // STEP 4: Test getToken import
    console.log("🎫 Testing getToken import...");
    try {
      const { getToken } = await import("next-auth/jwt");
      console.log("✅ getToken imported successfully");

      // Test NEXTAUTH_SECRET availability
      console.log(
        "🔑 NEXTAUTH_SECRET available:",
        !!process.env.NEXTAUTH_SECRET
      );
      console.log(
        "🔑 NEXTAUTH_SECRET length:",
        process.env.NEXTAUTH_SECRET?.length || 0
      );
    } catch (error) {
      console.error("❌ getToken import error:", error);
      throw new Error("getToken import failed");
    }

    console.log("🎉 All components imported successfully");
    return response;
  } catch (error) {
    console.error("💥 Step-by-step middleware error:", error);

    return new NextResponse(`Middleware Error: ${error.message}`, {
      status: 500,
      headers: {
        "X-Debug-Error": error.message,
      },
    });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
