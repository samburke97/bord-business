// components/auth/AuthFlowManager.tsx - NO FLASH FIX
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

  const [currentStep, setCurrentStep] = useState<FlowStep | null>(null);
  const [email, setEmail] = useState(
    initialEmail || searchParams.get("email") || ""
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    isNewUser: boolean;
    userName?: string;
  }>({ isNewUser: true });

  // Get the method parameter to know the flow type immediately
  const authMethod = searchParams.get("method"); // "oauth" or "email"

  useEffect(() => {
    const initializeFlow = async () => {
      console.log("🚀 AuthFlow: Starting initialization...", {
        hasSession: !!session,
        status,
        authMethod,
        email: email ? email.substring(0, 3) + "***" : "none",
        sessionEmail: session?.user?.email
          ? session.user.email.substring(0, 3) + "***"
          : "none",
      });

      if (status === "loading") {
        console.log("⏳ AuthFlow: Session still loading...");
        return;
      }

      // CRITICAL FIX: Check OAuth method FIRST - go straight to profile setup
      if (authMethod === "oauth") {
        console.log(
          "🔐 AuthFlow: OAuth method detected - going directly to profile setup"
        );
        setCurrentStep("setup");
        setUserInfo({
          isNewUser: false,
          userName: session?.user?.name || undefined,
        });
        setEmail(session?.user?.email || "");
        setIsInitializing(false);
        return;
      }

      // CRITICAL FIX: Check email method FIRST - go straight to verification
      if (authMethod === "email") {
        console.log(
          "📧 AuthFlow: Email method detected - going directly to verification"
        );
        setCurrentStep("verification");
        setUserInfo({
          isNewUser: true,
          userName: undefined,
        });
        setIsInitializing(false);
        return;
      }

      // FALLBACK: Old logic for cases without method parameter
      // OAUTH USER: Has session - this means they used OAuth sign-in
      if (session?.user) {
        console.log(
          "🔐 AuthFlow: OAuth user detected, checking profile status..."
        );

        try {
          const response = await fetch("/api/user/profile-status", {
            credentials: "include",
          });

          if (response.ok) {
            const profileData = await response.json();
            console.log("📋 AuthFlow: Profile status:", profileData);

            if (
              profileData.isProfileComplete &&
              profileData.firstName &&
              profileData.lastName &&
              profileData.username &&
              profileData.phone &&
              profileData.dateOfBirth
            ) {
              console.log(
                "✅ AuthFlow: Profile is fully complete, checking business status"
              );

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
            } else {
              console.log("📝 AuthFlow: Profile incomplete, missing fields:", {
                firstName: !profileData.firstName,
                lastName: !profileData.lastName,
                username: !profileData.username,
                phone: !profileData.phone,
                dateOfBirth: !profileData.dateOfBirth,
              });
            }
          }
        } catch (error) {
          console.error("❌ AuthFlow: Error checking profile status:", error);
        }

        console.log(
          "📝 AuthFlow: OAuth user needs profile setup - showing setup form"
        );
        setCurrentStep("setup");
        setUserInfo({
          isNewUser: false,
          userName: session.user.name || undefined,
        });
        setEmail(session.user.email || "");
        setIsInitializing(false);
        return;
      }

      // EMAIL SIGNUP: No session, but has email parameter
      if (!session && email) {
        console.log(
          "📧 AuthFlow: Email signup flow - starting with email verification"
        );
        setCurrentStep("verification");
        setUserInfo({
          isNewUser: true,
          userName: undefined,
        });
        setIsInitializing(false);
        return;
      }

      // FALLBACK: No session and no email - redirect to login
      console.log("❌ AuthFlow: No session or email, redirecting to login");
      router.push("/login");
    };

    initializeFlow();
  }, [session, status, email, router, authMethod]);

  const handleVerificationComplete = useCallback(
    (data: { isExistingUser: boolean }) => {
      console.log("✅ AuthFlow: Email verification complete, user data:", data);

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

  // Show loading until we know exactly which step to show
  if (isInitializing || status === "loading" || currentStep === null) {
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
                ? "Checking your authentication..."
                : "Determining the best path for you..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render the correct form based on currentStep
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
          email={email}
          onSetupComplete={handleSetupComplete}
        />
      );

    case "complete":
      return (
        <Congratulations
          onContinueToDashboard={handleContinueToDashboard}
          onRemindLater={handleRemindLater}
        />
      );

    default:
      return null;
  }
}
