// app/dashboard/page.tsx - PROPER BUSINESS SETUP CHECK
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
        console.log("🔍 Dashboard: Verifying business setup completion...");

        // Double-check business setup status
        const response = await fetch("/api/user/business-status", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Dashboard: Business status verification:", data);

        if (data.needsSetup) {
          console.log(
            "🚫 Dashboard: User hasn't completed business setup - redirecting"
          );
          router.push("/business-onboarding");
          return;
        }

        // User has completed business setup, load dashboard data
        console.log("✅ Dashboard: User has completed business setup");
        setBusinessData(data);
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

  // At this point, user is authenticated and has completed business setup
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

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  Business Setup Complete
                </span>
              </div>

              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt="Profile"
                  className="w-10 h-10 rounded-full"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-800 mb-2">
                Business Profile
              </h3>
              <p className="text-green-700 text-sm">
                {businessData?.businessName || "Your Business"}
              </p>
              <p className="text-green-600 text-xs mt-1">
                {businessData?.businessType || "Business Type"}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-800 mb-2">
                Account Status
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-700 text-sm">Active</span>
              </div>
              <p className="text-blue-600 text-xs mt-1">
                Role: {session?.user?.globalRole || "USER"}
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="font-semibold text-purple-800 mb-2">
                Quick Actions
              </h3>
              <button className="text-purple-700 text-sm hover:text-purple-900 underline">
                Manage Business
              </button>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-gray-600">No recent activity</p>
              <p className="text-gray-500 text-sm mt-1">
                Your business activity will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
