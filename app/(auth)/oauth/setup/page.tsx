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

      // If user is ACTIVE, check business status and route accordingly
      if (
        session.user.status === "ACTIVE" &&
        session.user.isVerified &&
        session.user.isActive
      ) {
        try {
          const businessResponse = await fetch("/api/user/business-status", {
            credentials: "include",
          });

          if (businessResponse.ok) {
            const businessData = await businessResponse.json();

            if (businessData.needsSetup) {
              router.push("/business/onboarding");
              return;
            } else {
              router.push("/dashboard");
              return;
            }
          } else {
            router.push("/business/onboarding");
            return;
          }
        } catch (error) {
          router.push("/business/onboarding");
          return;
        }
      }

      // If user is PENDING, always show the setup form
      // Do not check profile completion - force them to complete setup
      if (session.user.status === "PENDING") {
        console.log("PENDING OAuth user - showing setup form");
        setIsInitializing(false);
        return;
      }

      // Fallback - redirect to login if status is unknown
      router.push("/login");
    };

    initializeOAuthFlow();
  }, [session, status, router]);

  const handleSetupComplete = () => {
    router.push("/signup/success");
  };

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

  return (
    <BusinessSetupForm
      email={session?.user?.email || ""}
      onSetupComplete={handleSetupComplete}
      isOAuth={true}
    />
  );
}
