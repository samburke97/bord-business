// app/page.tsx - FIXED VERSION with proper routing logic
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
    // Check user's completion status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        credentials: true,
        ownedBusinesses: true,
        businessMemberships: true,
      },
    });

    if (!user) {
      console.log("🏠 Home page: User not found, redirecting to login");
      redirect("/login");
      return;
    }

    console.log("🏠 Home page: User status check:", {
      isVerified: user.isVerified,
      isActive: user.isActive,
      hasOwnedBusiness: user.ownedBusinesses.length > 0,
      hasBusinessMembership: user.businessMemberships.length > 0,
    });

    // 1. If user is not verified, send to auth/setup for verification
    if (!user.isVerified) {
      console.log("🏠 Home page: User not verified, sending to setup");
      redirect("/auth/setup");
      return;
    }

    // 2. If user has no business association, send to business onboarding
    if (
      user.ownedBusinesses.length === 0 &&
      user.businessMemberships.length === 0
    ) {
      console.log(
        "🏠 Home page: No business association, sending to business onboarding"
      );
      redirect("/business-onboarding");
      return;
    }

    // 3. If user is fully set up, send to dashboard
    console.log("🏠 Home page: User fully set up, sending to dashboard");
    redirect("/dashboard");
    return;
  } catch (error) {
    console.error("❌ Home page: Error checking user status:", error);
    // Fallback to auth/setup on error
    redirect("/auth/setup");
    return;
  }
}
