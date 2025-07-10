"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import AuthFlowManager from "@/components/auth/AuthFlowManager";

function AuthSetupContent() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");

  const email = searchParams.get("email") || "";

  useEffect(() => {
    const initializeSetup = async () => {
      if (status === "loading") {
        setStatusMessage("Checking authentication...");
        return;
      }

      // CASE 1: OAuth user with session - check their profile status
      if (session?.user) {
        console.log("🔐 Auth Setup: Authenticated user detected");
        setStatusMessage("Checking your profile...");

        try {
          const response = await fetch("/api/user/profile-status", {
            credentials: "include",
          });

          if (response.ok) {
            const profileData = await response.json();

            // If profile is already complete, check business status
            if (profileData.isProfileComplete) {
              setStatusMessage("Checking business setup...");

              const businessResponse = await fetch(
                "/api/user/business-status",
                {
                  credentials: "include",
                }
              );

              if (businessResponse.ok) {
                const businessData = await businessResponse.json();

                // If both complete, redirect to dashboard
                if (!businessData.needsSetup) {
                  setStatusMessage("Redirecting to dashboard...");
                  router.push("/dashboard");
                  return;
                }
              }
            }
          }
        } catch (error) {
          console.error("❌ Auth Setup: Error checking user status:", error);
        }

        // OAuth user needs profile setup - show the form
        setStatusMessage("Setting up your profile...");
        setIsReady(true);
        return;
      }

      // CASE 2: Email signup flow - no session yet, but has email
      if (!session && email) {
        console.log("📧 Auth Setup: Email signup flow for:", email);
        setStatusMessage("Starting account setup...");
        setIsReady(true);
        return;
      }

      // CASE 3: No session and no email - redirect to login
      if (!session && !email) {
        console.log("❌ Auth Setup: No session or email, redirecting to login");
        router.push("/login");
        return;
      }
    };

    initializeSetup();
  }, [status, session, email, router]);

  // Show loading until ready
  if (!isReady) {
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
              Preparing your account
            </h2>
            <p
              style={{
                color: "#6b7280",
                margin: 0,
                fontSize: "14px",
              }}
            >
              {statusMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Ready to show the auth flow
  return <AuthFlowManager initialEmail={email} />;
}

export default function AuthSetupPage() {
  return (
    <Suspense
      fallback={
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
            <p style={{ color: "#6b7280", margin: 0 }}>Loading...</p>
          </div>
        </div>
      }
    >
      <AuthSetupContent />
    </Suspense>
  );
}
