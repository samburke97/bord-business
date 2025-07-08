// app/(list)/dashboard/page.tsx - CRITICAL FIX - Block until complete
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProfileStatus {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  isProfileComplete: boolean;
  hasPassword: boolean;
}

interface BusinessStatus {
  needsSetup: boolean;
  hasOwnedBusiness: boolean;
  hasBusinessMembership: boolean;
  businessCount: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationMessage, setVerificationMessage] = useState(
    "Verifying access..."
  );

  useEffect(() => {
    const verifyFullAccess = async () => {
      // Wait for session to load
      if (status === "loading") {
        setVerificationMessage("Authenticating...");
        return;
      }

      if (!session) {
        console.log("❌ Dashboard: No session, redirecting to login");
        router.push("/login");
        return;
      }

      try {
        console.log(
          "🛡️ Dashboard: Starting complete verification for user:",
          session.user?.email
        );

        // STEP 1: Verify profile is complete
        setVerificationMessage("Checking your profile...");

        const profileResponse = await fetch("/api/user/profile-status", {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });

        if (!profileResponse.ok) {
          throw new Error(`Profile check failed: ${profileResponse.status}`);
        }

        const profileData: ProfileStatus = await profileResponse.json();

        console.log("👤 Dashboard: Profile verification:", {
          isComplete: profileData.isProfileComplete,
          hasRequiredFields: {
            firstName: !!profileData.firstName,
            lastName: !!profileData.lastName,
            username: !!profileData.username,
            phone: !!profileData.phone,
            dateOfBirth: !!profileData.dateOfBirth,
          },
        });

        // CRITICAL: If profile is incomplete, block dashboard access
        if (!profileData.isProfileComplete) {
          console.log(
            "🚫 Dashboard: Profile incomplete - redirecting to setup"
          );
          router.replace("/auth/setup");
          return;
        }

        // STEP 2: Verify business setup is complete
        setVerificationMessage("Checking your business setup...");

        const businessResponse = await fetch("/api/user/business-status", {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });

        if (!businessResponse.ok) {
          throw new Error(`Business check failed: ${businessResponse.status}`);
        }

        const businessData: BusinessStatus = await businessResponse.json();

        console.log("🏢 Dashboard: Business verification:", {
          needsSetup: businessData.needsSetup,
          hasOwnedBusiness: businessData.hasOwnedBusiness,
          hasBusinessMembership: businessData.hasBusinessMembership,
          businessCount: businessData.businessCount,
        });

        // CRITICAL: If business setup is needed, block dashboard access
        if (businessData.needsSetup) {
          console.log(
            "🚫 Dashboard: Business setup needed - redirecting to onboarding"
          );
          router.replace("/business-onboarding");
          return;
        }

        // ONLY if both profile AND business are complete, allow dashboard access
        console.log(
          "✅ Dashboard: Full verification passed - user can access dashboard"
        );
        setVerificationMessage("Welcome to your dashboard!");
        setIsVerifying(false);
      } catch (error) {
        console.error("❌ Dashboard: Verification failed:", error);

        // On any error, redirect to setup to be safe
        console.log(
          "🔄 Dashboard: Error during verification, redirecting to setup"
        );
        router.replace("/auth/setup");
      }
    };

    verifyFullAccess();
  }, [status, session, router]);

  // SHOW LOADING UNTIL VERIFICATION IS COMPLETE
  if (isVerifying || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4 max-w-md mx-auto px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Loading your dashboard...
            </h2>
            <p className="text-gray-600 text-sm">{verificationMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // ONLY render dashboard if user has passed ALL verifications
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {session?.user?.name || session?.user?.email}!
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Account Status:{" "}
                <span className="text-emerald-600 font-medium">Complete</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-emerald-900">
                    Profile Complete
                  </h3>
                  <p className="text-sm text-emerald-700">
                    Your profile is fully set up
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-blue-900">
                    Business Setup
                  </h3>
                  <p className="text-sm text-blue-700">
                    Your business is configured
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-purple-900">
                    Ready to Go
                  </h3>
                  <p className="text-sm text-purple-700">
                    All systems operational
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              🎉 Welcome to Your Dashboard!
            </h2>
            <p className="text-gray-500 mb-6">
              You have successfully completed all setup steps. Your account is
              ready to use.
            </p>
            <div className="flex justify-center space-x-4">
              <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
                Manage Locations
              </button>
              <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
