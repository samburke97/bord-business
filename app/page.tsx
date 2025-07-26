// app/page.tsx - FIXED: Prevent auto-redirect from success pages
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
    return;
  }

  // ✅ CRITICAL FIX: Check if user is coming from success pages
  const headersList = headers();
  const referer = headersList.get("referer") || "";

  // Don't auto-redirect if coming from success/completion pages
  if (
    referer.includes("/signup/success") ||
    referer.includes("/oauth/setup") ||
    referer.includes("/verify-email/success")
  ) {
    // Let them stay on success page - don't force business redirect
    redirect("/signup/success");
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
    if (user.status === "PENDING") {
      redirect("/oauth/setup");
      return;
    }

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

  // ✅ CRITICAL FIX: Only redirect to business onboarding if explicitly requested
  // Don't auto-redirect newly completed users
  if (!hasBusinessConnection) {
    redirect("/business/onboarding");
    return;
  }

  redirect("/dashboard");
}
