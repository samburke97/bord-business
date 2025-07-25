// app/page.tsx - FIXED: Direct database queries instead of API calls
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
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
      redirect("/login");
      return;
    }

    // Determine user type
    const isOAuthUser =
      user.accounts.length > 0 && !user.credentials?.passwordHash;
    const isEmailUser = !!user.credentials?.passwordHash;

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
        redirect("/oauth/setup"); // UPDATED
        redirect("/signup/complete");
        return;
      }
    } else if (isEmailUser) {
      if (!user.isVerified) {
        redirect(
          `/signup/verify-email?email=${encodeURIComponent(user.email || "")}`
        ); // UPDATED
        redirect("/signup/complete");
        return;
      }
      if (!isProfileComplete) {
        redirect("/signup/complete");
        return;
      }
    }

    // ✅ FIXED: Direct database query instead of fetch
    const hasBusinessConnection =
      (user.ownedBusinesses?.length || 0) > 0 ||
      (user.businessMemberships?.length || 0) > 0;

    if (!hasBusinessConnection) {
      redirect("/business/onboarding"); // UPDATED
      return;
    }

    // User is completely set up - go to dashboard
    redirect("/dashboard");
  } catch (error) {
    // Fallback to business onboarding on error (safer than login)
    redirect("/business/onboarding"); // UPDATED
  }
}
