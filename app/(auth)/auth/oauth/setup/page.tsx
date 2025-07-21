// app/(auth)/oauth/setup/page.tsx - Clean OAuth Setup Page
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

      console.log(
        "🔐 OAuth Setup: Valid session found, checking profile status..."
      );

      try {
        const response = await fetch("/api/user/profile-status", {
          credentials: "include",
        });

        if (response.ok) {
          const profileData = await response.json();
          console.log("📋 OAuth Setup: Profile status:", profileData);

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
              "✅ OAuth Setup: Profile is complete, checking business status"
            );

            const businessResponse = await fetch("/api/user/business-status", {
              credentials: "include",
            });

            if (businessResponse.ok) {
              const businessData = await businessResponse.json();

              if (businessData.needsSetup) {
                console.log(
                  "🏢 OAuth Setup: Business setup needed - redirecting to business onboarding"
                );
                router.push("/business-onboarding");
                return;
              } else {
                console.log(
                  "✅ OAuth Setup: User fully set up - redirecting to dashboard"
                );
                router.push("/dashboard");
                return;
              }
            }
          } else {
            console.log(
              "📝 OAuth Setup: Profile incomplete, showing profile setup form"
            );
          }
        }
      } catch (error) {
        console.error("❌ OAuth Setup: Error checking profile status:", error);
      }

      // Profile is incomplete - show the setup form
      setIsInitializing(false);
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

  // Render the profile setup form
  return (
    <BusinessSetupForm
      email={session?.user?.email || ""}
      onSetupComplete={handleSetupComplete}
      isOAuth={true} // Explicitly true for OAuth users
    />
  );
}
