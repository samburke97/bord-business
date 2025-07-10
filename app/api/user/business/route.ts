// // app/api/user/business/route.ts - CREATE BUSINESS ENDPOINT
// import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth/next";
// import { authOptions } from "@/lib/auth";
// import prisma from "@/lib/prisma";
// import { constantTimeDelay } from "@/lib/security/password";

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       console.log("❌ Create Business API: No session or user ID");
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     console.log("🏢 Create Business API: Request from user:", session.user.id);

//     const body = await request.json();
//     console.log("🔍 Create Business API: Received payload:", body);

//     const {
//       businessName,
//       businessType,
//       address,
//       city,
//       state,
//       postalCode,
//       latitude,
//       longitude,
//       sports,
//     } = body;

//     // Validate required fields individually for better error messages
//     const missingFields = [];
//     if (!businessName) missingFields.push("businessName");
//     if (!businessType) missingFields.push("businessType");
//     if (!address) missingFields.push("address");
//     if (!city) missingFields.push("city");
//     if (!state) missingFields.push("state");
//     if (!postalCode) missingFields.push("postalCode");

//     if (missingFields.length > 0) {
//       console.log(
//         "❌ Create Business API: Missing required fields:",
//         missingFields
//       );
//       console.log("Received data:", {
//         businessName: businessName || "MISSING",
//         businessType: businessType || "MISSING",
//         address: address || "MISSING",
//         city: city || "MISSING",
//         state: state || "MISSING",
//         postalCode: postalCode || "MISSING",
//       });
//       return NextResponse.json(
//         {
//           error: `Missing required fields: ${missingFields.join(", ")}`,
//           missingFields,
//           received: body,
//         },
//         { status: 400 }
//       );
//     }

//     console.log("🏢 Create Business API: Creating business:", {
//       businessName,
//       businessType,
//       address,
//       userId: session.user.id,
//     });

//     // Check if user already has a business
//     const existingBusiness = await prisma.business.findFirst({
//       where: {
//         ownerId: session.user.id,
//         isActive: true,
//       },
//     });

//     if (existingBusiness) {
//       console.log("⚠️ Create Business API: User already has a business");
//       return NextResponse.json(
//         { message: "User already has an active business" },
//         { status: 400 }
//       );
//     }

//     // Create slug from business name
//     const slug = businessName
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "-")
//       .replace(/^-+|-+$/g, "");

//     // Create business in database
//     const business = await prisma.business.create({
//       data: {
//         name: businessName,
//         slug,
//         businessType,
//         address,
//         city,
//         state,
//         postalCode,
//         latitude: latitude ? parseFloat(latitude.toString()) : null,
//         longitude: longitude ? parseFloat(longitude.toString()) : null,
//         ownerId: session.user.id,
//         isActive: true,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       },
//     });

//     // Create associated sports relationships if provided
//     if (sports && sports.length > 0) {
//       const sportConnections = sports.map((sport: any) => ({
//         businessId: business.id,
//         sportId: sport.id,
//       }));

//       await prisma.businessSport.createMany({
//         data: sportConnections,
//         skipDuplicates: true,
//       });
//     }

//     console.log("✅ Create Business API: Business created successfully:", {
//       businessId: business.id,
//       businessName: business.name,
//       ownerId: business.ownerId,
//     });

//     return NextResponse.json({
//       success: true,
//       business: {
//         id: business.id,
//         businessName: business.name,
//         businessType: business.businessType,
//         address: business.address,
//         slug: business.slug,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Create Business API: Error:", error);

//     // Apply constant time delay for security
//     await constantTimeDelay();

//     return NextResponse.json(
//       { message: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

// export async function GET(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       console.log("❌ Business Status API: No session or user ID");
//       await constantTimeDelay();
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     console.log(
//       "🔍 Business Status API: Session found for user:",
//       session.user.id
//     );

//     // Check if user has any businesses
//     const userWithBusinesses = await prisma.user.findUnique({
//       where: { id: session.user.id },
//       include: {
//         ownedBusinesses: {
//           select: {
//             id: true,
//             name: true,
//             slug: true,
//             isActive: true,
//           },
//         },
//         businessMemberships: {
//           include: {
//             business: {
//               select: {
//                 id: true,
//                 name: true,
//                 slug: true,
//                 isActive: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!userWithBusinesses) {
//       console.log("❌ Business Status API: User not found in database");
//       await constantTimeDelay();
//       return NextResponse.json({ message: "User not found" }, { status: 404 });
//     }

//     // Determine if user needs business setup
//     const activeOwnedBusinesses = userWithBusinesses.ownedBusinesses.filter(
//       (business) => business.isActive
//     );
//     const activeMemberships = userWithBusinesses.businessMemberships.filter(
//       (membership) => membership.business.isActive
//     );

//     const hasOwnedBusiness = activeOwnedBusinesses.length > 0;
//     const hasBusinessMembership = activeMemberships.length > 0;
//     const needsSetup = !hasOwnedBusiness && !hasBusinessMembership;

//     const responseData = {
//       needsSetup,
//       hasOwnedBusiness,
//       hasBusinessMembership,
//       businessCount: activeOwnedBusinesses.length,
//       membershipCount: activeMemberships.length,
//       ownedBusinesses: activeOwnedBusinesses,
//       memberships: activeMemberships.map((m) => m.business),
//     };

//     console.log("📊 Business Status API: Response data:", {
//       needsSetup,
//       hasOwnedBusiness,
//       hasBusinessMembership,
//       businessCount: activeOwnedBusinesses.length,
//       membershipCount: activeMemberships.length,
//     });

//     return NextResponse.json(responseData);
//   } catch (error) {
//     console.error("❌ Business Status API: Error:", error);

//     // Apply constant time delay for security
//     await constantTimeDelay();

//     return NextResponse.json(
//       {
//         message: "Internal server error",
//         needsSetup: true, // Default to requiring setup on error
//       },
//       { status: 500 }
//     );
//   }
// }

// app/api/user/business/route.ts - EXAMPLE: CSRF Protection Implementation
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { CSRFProtection } from "@/lib/security/csrf";
import prisma from "@/lib/prisma";
import { constantTimeDelay } from "@/lib/security/password";

export async function POST(request: NextRequest) {
  try {
    // PRIORITY 1: CSRF Protection for state-changing operations
    const csrfResult = await CSRFProtection.middleware()(request);
    if (csrfResult) {
      return csrfResult; // CSRF validation failed
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("❌ Create Business API: No session or user ID");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // PRIORITY 1: Sanitized logging - no sensitive data
    if (process.env.NODE_ENV === "development") {
      console.log("🏢 Create Business API: Request from authenticated user");
    }

    const body = await request.json();
    const {
      businessName,
      businessType,
      address,
      city,
      state,
      postalCode,
      latitude,
      longitude,
      sports,
    } = body;

    // Validate required fields individually for better error messages
    const missingFields = [];
    if (!businessName) missingFields.push("businessName");
    if (!businessType) missingFields.push("businessType");
    if (!address) missingFields.push("address");
    if (!city) missingFields.push("city");
    if (!state) missingFields.push("state");
    if (!postalCode) missingFields.push("postalCode");

    if (missingFields.length > 0) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "❌ Create Business API: Missing required fields:",
          missingFields
        );
      }
      return NextResponse.json(
        {
          error: `Missing required fields: ${missingFields.join(", ")}`,
          missingFields,
        },
        { status: 400 }
      );
    }

    // Create business logic here...
    const business = await prisma.business.create({
      data: {
        name: businessName,
        type: businessType,
        address,
        city,
        state,
        postalCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        ownerId: session.user.id,
        isActive: true,
        // Add sports if provided
        ...(sports &&
          sports.length > 0 && {
            sports: {
              connect: sports.map((sportId: string) => ({ id: sportId })),
            },
          }),
      },
    });

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Create Business API: Business created successfully");
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        type: business.type,
      },
    });
  } catch (error) {
    // PRIORITY 1: Sanitized error logging
    console.error("❌ Create Business API: Error occurred");

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
