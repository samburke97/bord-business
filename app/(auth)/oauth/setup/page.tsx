// app/(auth)/auth/oauth/setup/page.tsx - FIXED: Remove auto-routing to business onboarding
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
      if (status === "loading") {
        return;
      }

      if (!session?.user) {
        router.push("/login");
        return;
      }

      if (
        session.user.status === "ACTIVE" &&
        session.user.isVerified &&
        session.user.isActive &&
        isInitializing
      ) {
        try {
          const businessResponse = await fetch("/api/user/business-status", {
            credentials: "include",
          });

          if (businessResponse.ok) {
            const businessData = await businessResponse.json();

            if (businessData.needsSetup) {
              router.push("/business-onboarding");
              return;
            } else {
              router.push("/dashboard");
              return;
            }
          } else {
            // Fallback to business onboarding
            router.push("/business-onboarding");
            return;
          }
        } catch (error) {
          // Fallback to business onboarding
          router.push("/business-onboarding");
          return;
        }
      }

      // If user is PENDING, check profile completion
      if (session.user.status === "PENDING") {
        try {
          const response = await fetch("/api/user/profile-status", {
            credentials: "include",
          });

          if (response.ok) {
            const profileData = await response.json();

            // Check if profile is complete with ALL required fields
            if (
              profileData.isProfileComplete &&
              profileData.firstName &&
              profileData.lastName &&
              profileData.username &&
              profileData.phone &&
              profileData.dateOfBirth
            ) {
              router.push("/business-onboarding");
              return;
            } else {
              setIsInitializing(false);
              return;
            }
          } else {
            // Show setup form as fallback
            setIsInitializing(false);
            return;
          }
        } catch (error) {
          // Show setup form as fallback
          setIsInitializing(false);
          return;
        }
      }
      router.push("/login");
    };

    initializeOAuthFlow();
  }, [session, status, router]);

  // ✅ FIXED: Remove auto-routing - just go to congratulations without next parameter
  const handleSetupComplete = () => {
    router.push("/signup/success");
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
