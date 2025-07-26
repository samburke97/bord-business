// app/(auth)/oauth/setup/page.tsx - FIXED: Prevent useEffect re-triggering
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import BusinessSetupForm from "@/components/auth/BusinessSetupForm";

export default function OAuthSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);

  // ✅ CRITICAL FIX: More granular state management
  const setupCompletedRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const lastSessionStatusRef = useRef("");

  useEffect(() => {
    const initializeOAuthFlow = async () => {
      if (status === "loading") {
        return;
      }

      if (!session?.user) {
        if (!isNavigatingRef.current) {
          isNavigatingRef.current = true;
          router.push("/login");
        }
        return;
      }

      // ✅ CRITICAL FIX: Prevent re-routing after setup completion
      if (setupCompletedRef.current || isNavigatingRef.current) {
        return;
      }

      // ✅ CRITICAL FIX: Only trigger routing logic on actual status changes
      const currentSessionKey = `${session.user.id}-${session.user.status}-${session.user.isActive}`;
      if (lastSessionStatusRef.current === currentSessionKey) {
        // No actual change, just a re-render
        if (session.user.status === "PENDING") {
          setIsInitializing(false);
        }
        return;
      }
      lastSessionStatusRef.current = currentSessionKey;

      if (
        session.user.status === "ACTIVE" &&
        session.user.isVerified &&
        session.user.isActive
      ) {
        isNavigatingRef.current = true;

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

      if (session.user.status === "PENDING") {
        console.log("PENDING OAuth user - showing setup form");
        setIsInitializing(false);
        return;
      }

      // Fallback
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        router.push("/login");
      }
    };

    initializeOAuthFlow();
  }, [session?.user?.id, session?.user?.status, status, router]); // ✅ CRITICAL FIX: More specific dependencies

  const handleSetupComplete = () => {
    // ✅ CRITICAL FIX: Prevent any further routing logic
    setupCompletedRef.current = true;
    isNavigatingRef.current = true;

    // Navigate to success page and let user control next step
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
              Please wait while we prepare your account
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
