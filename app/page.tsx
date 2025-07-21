// app/page.tsx - FIXED: Direct database queries instead of API calls
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function Home() {
  const session = await getServerSession(authOptions);

  console.log("🏠 Home page: Session check:", { hasSession: !!session });

  if (!session) {
    console.log("🏠 Home page: No session, redirecting to login");
    redirect("/login");
    return;
  }

  try {
    // Get user with accounts, credentials, and business relationships
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: true,
        credentials: true,
        ownedBusinesses: {
          where: { isActive: true },
        },
        businessMemberships: {
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      console.log("🏠 Home page: User not found, redirecting to login");
      redirect("/login");
      return;
    }

    // Determine user type
    const isOAuthUser =
      user.accounts.length > 0 && !user.credentials?.passwordHash;
    const isEmailUser = !!user.credentials?.passwordHash;

    console.log("🏠 Home page: User analysis:", {
      userId: user.id,
      isOAuthUser,
      isEmailUser,
      hasAccounts: user.accounts.length > 0,
      hasPasswordHash: !!user.credentials?.passwordHash,
      isVerified: user.isVerified,
      status: user.status,
    });

    // Check if user needs to complete profile setup
    const isProfileComplete = !!(
      user.firstName &&
      user.lastName &&
      user.username &&
      user.phone &&
      user.dateOfBirth
    );

    // Route based on user type and completion status
    if (isOAuthUser) {
      if (!isProfileComplete) {
        console.log("🔐 Home page: OAuth user needs profile setup");
        redirect("/auth/oauth/setup");
        return;
      }
    } else if (isEmailUser) {
      if (!user.isVerified) {
        console.log("📧 Home page: Email user needs verification");
        redirect(`/verify-email?email=${encodeURIComponent(user.email || "")}`);
        return;
      }
      if (!isProfileComplete) {
        console.log("📧 Home page: Email user needs profile setup");
        redirect(
          `/auth/email/setup?email=${encodeURIComponent(user.email || "")}`
        );
        return;
      }
    }

    // User is fully set up - check business status using direct database query
    console.log("✅ Home page: User setup complete, checking business status");

    // ✅ FIXED: Direct database query instead of fetch
    const hasBusinessConnection =
      (user.ownedBusinesses?.length || 0) > 0 ||
      (user.businessMemberships?.length || 0) > 0;

    console.log("📊 Home page: Business status analysis:", {
      userId: user.id.substring(0, 8) + "***", // Obfuscate ID
      hasBusinessConnection,
      needsBusinessSetup: !hasBusinessConnection,
      // Simple counts only - no sensitive data
      businessCount:
        (user.ownedBusinesses?.length || 0) +
        (user.businessMemberships?.length || 0),
    });

    if (!hasBusinessConnection) {
      console.log("🏢 Home page: User needs business onboarding");
      redirect("/business-onboarding");
      return;
    }

    // User is completely set up - go to dashboard
    console.log("✅ Home page: User fully set up - redirecting to dashboard");
    redirect("/dashboard");
  } catch (error) {
    console.error("🏠 Home page: Error checking user status:", error);
    // Fallback to business onboarding on error (safer than login)
    redirect("/business-onboarding");
  }
}
