"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface BusinessStatus {
  businessCount: number;
  membershipCount: number;
  ownedBusinesses: any[];
  memberships: any[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [businessData, setBusinessData] = useState<BusinessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (status === "loading") return;

      try {
        const response = await fetch("/api/user/business-status", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setBusinessData(data);
        }
      } catch (error) {
        console.error("Error fetching business data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back, {session?.user?.name || session?.user?.email}!
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Profile Status */}
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

            {/* Business Status */}
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

            {/* Ready Status */}
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

          {/* Main Dashboard Content */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                🎉 Welcome to Your Dashboard!
              </h2>
              <p className="text-gray-600 mb-6">
                You have successfully completed all setup steps. Your account is
                ready to use.
              </p>

              {/* Business Information */}
              {businessData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Owned Businesses
                    </h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {businessData.businessCount}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Business Memberships
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      {businessData.membershipCount}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Manage Businesses
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  View Analytics
                </button>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
