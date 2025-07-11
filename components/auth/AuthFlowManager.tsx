// components/auth/AuthFlowManager.tsx - FIXED - No infinite loop
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import EmailVerification from "./EmailVerification";
import PasswordScreen from "./PasswordScreen";
import BusinessSetupForm from "./BusinessSetupForm";
import Congratulations from "./Congratulations";

type FlowStep = "verification" | "password" | "setup" | "complete";

interface AuthFlowManagerProps {
  initialEmail?: string;
}

export default function AuthFlowManager({
  initialEmail,
}: AuthFlowManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [currentStep, setCurrentStep] = useState<FlowStep>("setup");
  const [email, setEmail] = useState(
    initialEmail || searchParams.get("email") || ""
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    isNewUser: boolean;
    userName?: string;
  }>({ isNewUser: true });

  useEffect(() => {
    const initializeFlow = async () => {
      console.log("🚀 AuthFlow: Starting initialization...", {
        hasSession: !!session,
        status,
        email,
      });

      if (status === "loading") {
        return;
      }

      // OAUTH USER: Has session but needs profile setup
      if (session?.user) {
        console.log("🔐 AuthFlow: OAuth user detected");

        // CRITICAL FIX: Check if OAuth user has already completed setup
        try {
          const response = await fetch("/api/user/profile-status", {
            credentials: "include",
          });

          if (response.ok) {
            const profileData = await response.json();

            // CRITICAL FIX: If profile is complete, check business status
            if (profileData.isProfileComplete) {
              console.log(
                "✅ AuthFlow: Profile complete, checking business status"
              );

              // Check business status
              const businessResponse = await fetch(
                "/api/user/business-status",
                {
                  credentials: "include",
                }
              );

              if (businessResponse.ok) {
                const businessData = await businessResponse.json();

                if (businessData.needsSetup) {
                  console.log(
                    "🏢 AuthFlow: Business setup needed - redirecting to business onboarding"
                  );
                  router.push("/business-onboarding");
                  return;
                } else {
                  console.log(
                    "✅ AuthFlow: User fully set up - redirecting to dashboard"
                  );
                  router.push("/dashboard");
                  return;
                }
              }
            }
          }
        } catch (error) {
          console.error("❌ AuthFlow: Error checking profile status:", error);
        }

        // If profile is not complete, show setup
        console.log("📝 AuthFlow: OAuth user needs profile setup");
        setCurrentStep("setup");
        setUserInfo({
          isNewUser: false,
          userName: session.user.name || undefined,
        });
        setIsInitializing(false);
        return;
      }

      // EMAIL SIGNUP: No session, but has email - go directly to setup form
      if (!session && email) {
        console.log(
          "📧 AuthFlow: Email signup flow - going directly to setup form"
        );
        setCurrentStep("setup");
        setUserInfo({
          isNewUser: true,
          userName: undefined,
        });
        setIsInitializing(false);
        return;
      }

      // FALLBACK: No session and no email
      console.log("❌ AuthFlow: No session or email, redirecting to login");
      router.push("/login");
    };

    initializeFlow();
  }, [session, status, email, router]);

  const handleVerificationComplete = useCallback(
    (data: { isExistingUser: boolean }) => {
      console.log("✅ AuthFlow: Verification complete, user data:", data);

      setUserInfo({
        isNewUser: !data.isExistingUser,
        userName: userInfo.userName,
      });

      setCurrentStep("password");
    },
    [userInfo.userName]
  );

  const handlePasswordComplete = useCallback(() => {
    console.log(
      "✅ AuthFlow: Password complete, user is new:",
      userInfo.isNewUser
    );

    if (userInfo.isNewUser) {
      setCurrentStep("setup");
    } else {
      // Existing users - routing handled in PasswordScreen
      console.log("ℹ️ AuthFlow: Existing user login handled by PasswordScreen");
    }
  }, [userInfo.isNewUser]);

  const handleSetupComplete = useCallback(() => {
    console.log(
      "✅ AuthFlow: Profile setup complete - redirecting to business onboarding"
    );
    router.push("/business-onboarding");
  }, [router]);

  const handleContinueToDashboard = useCallback(() => {
    console.log("🏠 AuthFlow: Continuing to dashboard");
    router.push("/dashboard");
  }, [router]);

  const handleRemindLater = useCallback(() => {
    console.log("⏰ AuthFlow: Remind later selected");
    router.push("/dashboard");
  }, [router]);

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
              Setting up your flow...
            </h2>
            <p
              style={{
                color: "#6b7280",
                margin: 0,
                fontSize: "14px",
              }}
            >
              {status === "loading"
                ? "Checking authentication..."
                : "Preparing your account..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render current step
  switch (currentStep) {
    case "verification":
      return (
        <EmailVerification
          email={email}
          onVerificationComplete={handleVerificationComplete}
        />
      );

    case "password":
      return (
        <PasswordScreen
          email={email}
          userName={userInfo.userName}
          isNewUser={userInfo.isNewUser}
          onPasswordComplete={handlePasswordComplete}
        />
      );

    case "setup":
      return (
        <BusinessSetupForm
          email={email || session?.user?.email || ""}
          onSetupComplete={handleSetupComplete}
        />
      );

    case "complete":
      return (
        <Congratulations
          onContinue={handleContinueToDashboard}
          onRemindLater={handleRemindLater}
        />
      );

    default:
      console.error("❌ AuthFlow: Unknown step:", currentStep);
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
          }}
        >
          <div>Error: Unknown authentication step</div>
        </div>
      );
  }
}
