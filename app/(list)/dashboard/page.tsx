// app/(list)/dashboard/page.tsx - FIXED TO CHECK PROFILE FIRST
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [businessData, setBusinessData] = useState<any>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (status === "loading") return;

      if (!session) {
        router.push("/login");
        return;
      }

      try {
        console.log("🔍 Dashboard: First checking profile completion...");

        // STEP 1: Check if user has completed their profile
        const profileResponse = await fetch("/api/user/profile-status", {
          method: "GET",
          credentials: "include",
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();

          const hasCompleteProfile = !!(
            profileData.firstName &&
            profileData.lastName &&
            profileData.username &&
            profileData.phone &&
            profileData.dateOfBirth
          );

          console.log("👤 Dashboard: Profile status:", {
            hasCompleteProfile,
            missing: {
              firstName: !profileData.firstName,
              lastName: !profileData.lastName,
              username: !profileData.username,
              phone: !profileData.phone,
              dateOfBirth: !profileData.dateOfBirth,
            },
          });

          if (!hasCompleteProfile) {
            console.log(
              "🏗️ Dashboard: User needs profile setup - redirecting to business setup form"
            );
            router.push("/auth/setup");
            return;
          }
        }

        console.log(
          "🔍 Dashboard: Profile complete, now checking business status..."
        );

        // STEP 2: Check business setup status
        const businessResponse = await fetch("/api/user/business-status", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!businessResponse.ok) {
          throw new Error(
            `HTTP ${businessResponse.status}: ${businessResponse.statusText}`
          );
        }

        const businessData = await businessResponse.json();
        console.log(
          "📊 Dashboard: Business status verification:",
          businessData
        );

        if (businessData.needsSetup) {
          console.log(
            "🚫 Dashboard: User hasn't completed business setup - redirecting"
          );
          router.push("/business-onboarding");
          return;
        }

        // User has completed everything, load dashboard
        console.log("✅ Dashboard: User has completed all setup");
        setBusinessData(businessData);
        setIsLoading(false);
      } catch (error) {
        console.error("❌ Dashboard: Error verifying access:", error);
        // If we can't verify, redirect to business onboarding to be safe
        router.push("/business-onboarding");
      }
    };

    checkAccess();
  }, [session, status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // At this point, user is authenticated and has completed everything
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {session?.user?.name}!
              </p>
            </div>
          </div>

          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              🎉 Your account is fully set up!
            </h2>
            <p className="text-gray-500">
              You have completed both profile setup and business onboarding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
