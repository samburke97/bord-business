// app/(auth)/auth/oauth/setup/page.tsx - FIXED: Better status detection
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BusinessSetupForm from "@/components/auth/BusinessSetupForm";

export default function OAuthSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeOAuthFlow = async () => {
      console.log("🔐 OAuth Setup: Starting initialization...", {
        hasSession: !!session,
        status,
        userEmail: session?.user?.email
          ? session.user.email.substring(0, 3) + "***"
          : "none",
        userStatus: session?.user?.status,
        isVerified: session?.user?.isVerified,
        isActive: session?.user?.isActive,
      });

      if (status === "loading") {
        console.log("⏳ OAuth Setup: Session still loading...");
        return;
      }

      // If no session, redirect to login
      if (!session?.user) {
        console.log("❌ OAuth Setup: No session found, redirecting to login");
        router.push("/login");
        return;
      }

      // ✅ CRITICAL FIX: If user is already ACTIVE, skip everything and go to dashboard
      if (
        session.user.status === "ACTIVE" &&
        session.user.isVerified &&
        session.user.isActive
      ) {
        console.log(
          "✅ OAuth Setup: User is already ACTIVE - checking business status directly"
        );

        try {
          const businessResponse = await fetch("/api/user/business-status", {
            credentials: "include",
          });

          if (businessResponse.ok) {
            const businessData = await businessResponse.json();
            console.log(
              "📊 OAuth Setup: Business status for ACTIVE user:",
              businessData
            );

            if (businessData.needsSetup) {
              console.log(
                "🏢 OAuth Setup: ACTIVE user needs business setup - redirecting to business onboarding"
              );
              router.push("/business-onboarding");
              return;
            } else {
              console.log(
                "✅ OAuth Setup: ACTIVE user fully set up - redirecting to dashboard"
              );
              router.push("/dashboard");
              return;
            }
          } else {
            console.error(
              "❌ OAuth Setup: Failed to fetch business status:",
              businessResponse.status
            );
            // Fallback to business onboarding
            router.push("/business-onboarding");
            return;
          }
        } catch (error) {
          console.error(
            "❌ OAuth Setup: Error checking business status for ACTIVE user:",
            error
          );
          // Fallback to business onboarding
          router.push("/business-onboarding");
          return;
        }
      }

      // If user is PENDING, check profile completion
      if (session.user.status === "PENDING") {
        console.log(
          "🔐 OAuth Setup: User is PENDING - checking profile completion..."
        );

        try {
          const response = await fetch("/api/user/profile-status", {
            credentials: "include",
          });

          if (response.ok) {
            const profileData = await response.json();
            console.log(
              "📋 OAuth Setup: Profile status for PENDING user:",
              profileData
            );

            // Check if profile is complete with ALL required fields
            if (
              profileData.isProfileComplete &&
              profileData.firstName &&
              profileData.lastName &&
              profileData.username &&
              profileData.phone &&
              profileData.dateOfBirth
            ) {
              console.log(
                "✅ OAuth Setup: PENDING user profile is complete - should not happen, redirecting to activation"
              );
              // This shouldn't happen - if profile is complete, user should be ACTIVE
              // But handle it gracefully
              router.push("/business-onboarding");
              return;
            } else {
              console.log(
                "📝 OAuth Setup: PENDING user profile incomplete, showing setup form"
              );
              setIsInitializing(false);
              return;
            }
          } else {
            console.error(
              "❌ OAuth Setup: Failed to fetch profile status:",
              response.status
            );
            // Show setup form as fallback
            setIsInitializing(false);
            return;
          }
        } catch (error) {
          console.error(
            "❌ OAuth Setup: Error checking profile status:",
            error
          );
          // Show setup form as fallback
          setIsInitializing(false);
          return;
        }
      }

      // Handle unexpected user status
      console.log(
        "❌ OAuth Setup: Unexpected user status:",
        session.user.status
      );
      console.log("🔄 OAuth Setup: Redirecting to login for safety");
      router.push("/login");
    };

    initializeOAuthFlow();
  }, [session, status, router]);

  const handleSetupComplete = () => {
    console.log(
      "✅ OAuth Setup: Profile setup complete - redirecting to business onboarding"
    );
    router.push("/business-onboarding");
  };

  // Show loading while initializing
  if (isInitializing || status === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e5e7eb",
              borderTop: "4px solid #10b981",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
                margin: "0 0 8px 0",
              }}
            >
              Setting up your profile...
            </h2>
            <p
              style={{
                color: "#6b7280",
                margin: 0,
                fontSize: "14px",
              }}
            >
              {status === "loading"
                ? "Verifying your account..."
                : "Preparing your profile setup..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render the profile setup form (only for PENDING users with incomplete profiles)
  return (
    <BusinessSetupForm
      email={session?.user?.email || ""}
      onSetupComplete={handleSetupComplete}
      isOAuth={true} // Explicitly true for OAuth users
    />
  );
}
