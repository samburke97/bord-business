// app/page.tsx - Fixed routing logic for OAuth and email users
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

    const isOAuthUser =
      user.accounts.length > 0 && !user.credentials?.passwordHash;
    const isEmailUser = !!user.credentials?.passwordHash;

    const isProfileComplete = !!(
      user.firstName &&
      user.lastName &&
      user.username &&
      user.phone &&
      user.dateOfBirth
    );

    if (isOAuthUser) {
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
  } catch (error) {
    redirect("/business/onboarding");
  }
}
