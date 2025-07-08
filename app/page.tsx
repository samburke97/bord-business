// app/page.tsx - FIXED TO PREVENT DASHBOARD FLASH
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

  // For authenticated users, check their profile completion status
  try {
    console.log("🏠 Home page: Checking user profile status for routing...");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        dateOfBirth: true,
        ownedBusinesses: {
          where: { isActive: true },
          select: { id: true },
        },
        businessMemberships: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!user) {
      console.log("❌ Home page: User not found, redirecting to login");
      redirect("/login");
      return;
    }

    // Check if profile is complete
    const hasCompleteProfile = !!(
      user.firstName &&
      user.lastName &&
      user.username &&
      user.phone &&
      user.dateOfBirth
    );

    // Check if user has business setup
    const hasBusiness =
      user.ownedBusinesses.length > 0 || user.businessMemberships.length > 0;

    console.log("📊 Home page: User routing analysis:", {
      userId: user.id,
      hasCompleteProfile,
      hasBusiness,
      redirect: !hasCompleteProfile
        ? "/auth/setup"
        : !hasBusiness
          ? "/business-onboarding"
          : "/dashboard",
    });

    // Route based on completion status
    if (!hasCompleteProfile) {
      console.log("🏗️ Home page: User needs profile setup");
      redirect("/auth/setup");
      return;
    }

    if (!hasBusiness) {
      console.log("🏢 Home page: User needs business onboarding");
      redirect("/business-onboarding");
      return;
    }

    console.log("✅ Home page: User fully setup, going to dashboard");
    redirect("/dashboard");
    return;
  } catch (error) {
    console.error("❌ Home page: Error checking user status:", error);
    // Fallback to dashboard on error
    redirect("/dashboard");
    return;
  }
}
