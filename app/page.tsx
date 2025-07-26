// app/page.tsx - FIXED: Proper OAuth status routing
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

  let user;
  try {
    user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error("Database error:", error);
    redirect("/login");
    return;
  }

  if (!user) {
    redirect("/login");
    return;
  }

  const isOAuthUser =
    user.accounts.length > 0 && !user.credentials?.passwordHash;
  const isEmailUser = !!user.credentials?.passwordHash;

  const isProfileComplete = !!(
    user.firstName &&
    user.lastName &&
    user.phone &&
    user.dateOfBirth
  );

  if (isOAuthUser) {
    // ✅ CRITICAL FIX: Check status FIRST - PENDING users must complete setup
    if (user.status === "PENDING") {
      redirect("/oauth/setup");
      return;
    }

    // THEN: Check profile completion for ACTIVE users
    if (!isProfileComplete) {
      redirect("/oauth/setup");
      return;
    }
  } else if (isEmailUser) {
    if (!user.isVerified) {
      redirect(
        `/signup/verify-email?email=${encodeURIComponent(user.email || "")}`
      );
      return;
    }
    if (!isProfileComplete) {
      redirect("/signup/complete");
      return;
    }
  }

  const hasBusinessConnection =
    (user.ownedBusinesses?.length || 0) > 0 ||
    (user.businessMemberships?.length || 0) > 0;

  if (!hasBusinessConnection) {
    redirect("/business/onboarding");
    return;
  }

  redirect("/dashboard");
}
