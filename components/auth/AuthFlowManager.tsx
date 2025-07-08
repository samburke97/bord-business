// components/auth/AuthFlowManager.tsx - COMPLETE UPDATED WITH OAUTH SUPPORT
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

  const [currentStep, setCurrentStep] = useState<FlowStep>("verification");
  const [email, setEmail] = useState(
    initialEmail || searchParams.get("email") || ""
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    isNewUser: boolean;
    userName?: string;
  }>({ isNewUser: true });

  // Memoize the business status check to prevent re-renders
  const checkBusinessStatus = useCallback(async () => {
    try {
      console.log("🔍 AuthFlow: Checking business status...");

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
      console.log("📊 AuthFlow: Business status response:", data);

      if (data.needsSetup) {
        console.log("🏗️ AuthFlow: User needs business setup");
        router.push("/business-onboarding");
      } else {
        console.log(
          "✅ AuthFlow: User is fully set up, redirecting to dashboard"
        );
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("❌ AuthFlow: Error checking business status:", error);
      // Default to business onboarding if we can't determine status
      console.log(
        "🔄 AuthFlow: Defaulting to business onboarding due to error"
      );
      router.push("/business-onboarding");
    }
  }, [router]);

  // Initialize flow - handles both OAuth and email users
  useEffect(() => {
    if (hasInitialized) return; // Prevent multiple calls

    const initializeFlow = async () => {
      console.log("🚀 AuthFlow: Initializing flow...", {
        hasSession: !!session,
        email,
        sessionStatus: status,
      });

      // Wait for session to load
      if (status === "loading") {
        console.log("⏳ AuthFlow: Session still loading...");
        return;
      }

      // Check if user is already authenticated (OAuth case)
      if (session?.user) {
        console.log(
          "🔐 AuthFlow: Authenticated user detected, checking if OAuth..."
        );

        try {
          const response = await fetch("/api/user/profile-status", {
            method: "GET",
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            const isOAuthUser = !data.hasPassword;

            console.log("👤 AuthFlow: User profile status:", {
              isOAuthUser,
              hasPassword: data.hasPassword,
              hasCompleteProfile: data.isProfileComplete,
            });

            if (isOAuthUser) {
              console.log(
                "🎯 AuthFlow: OAuth user detected - going directly to setup step"
              );
              setCurrentStep("setup");
              setUserInfo({
                isNewUser: false, // OAuth users are technically "existing" after account creation
                userName: session.user.name || undefined,
              });
              setHasInitialized(true);
              setIsInitializing(false);
              return;
            }
          }
        } catch (error) {
          console.error("❌ AuthFlow: Error checking OAuth status:", error);
          // Continue with email flow if profile check fails
        }
      }

      // Continue with normal email flow for non-OAuth users
      if (!email) {
        console.log("❌ AuthFlow: No email provided, redirecting to login");
        router.push("/login");
        return;
      }

      try {
        console.log(
          "📧 AuthFlow: Sending initial verification code to:",
          email
        );

        const response = await fetch("/api/auth/send-verification-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "❌ AuthFlow: Failed to send initial verification code:",
            errorData.message
          );
        } else {
          const data = await response.json();
          console.log("✅ AuthFlow: Verification code sent, user info:", data);

          setUserInfo({
            isNewUser: data.isNewUser || false,
            userName: data.userName,
          });
        }
      } catch (error) {
        console.error(
          "❌ AuthFlow: Error sending initial verification code:",
          error
        );
      } finally {
        setIsInitializing(false);
        setHasInitialized(true);
      }
    };

    initializeFlow();
  }, [email, router, hasInitialized, session, status]);

  // Check session and route user appropriately
  useEffect(() => {
    if (status === "loading" || isInitializing || !hasInitialized) return;

    console.log("🔐 AuthFlow: Session status:", status, "Session:", !!session);

    // If user is already authenticated and verified, check business status
    if (session?.user && session.user.isVerified && currentStep !== "setup") {
      console.log("✅ AuthFlow: User is authenticated and verified");
      checkBusinessStatus();
      return;
    }

    // If no email provided and no session, redirect back to login
    if (!email && !session) {
      console.log("❌ AuthFlow: No email or session, redirecting to login");
      router.push("/login");
      return;
    }

    // Stay on current step by default
    console.log(`📧 AuthFlow: Staying on ${currentStep} step`);
  }, [
    session,
    status,
    email,
    router,
    isInitializing,
    hasInitialized,
    checkBusinessStatus,
    currentStep,
  ]);

  const handleVerificationComplete = useCallback(
    (data: { isExistingUser: boolean }) => {
      console.log("✅ AuthFlow: Verification complete, user data:", data);

      // Update user info based on verification response
      setUserInfo({
        isNewUser: !data.isExistingUser, // Convert to our internal naming
        userName: userInfo.userName,
      });

      // Always go to password step after verification
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
      // New users go to setup
      setCurrentStep("setup");
    } else {
      // Existing users routing is handled in PasswordScreen component
      // This callback shouldn't be called for existing users
      console.log(
        "⚠️ AuthFlow: Password complete called for existing user - this shouldn't happen"
      );
    }
  }, [userInfo.isNewUser]);

  const handleSetupComplete = useCallback(() => {
    console.log("✅ AuthFlow: Setup complete");
    setCurrentStep("complete");
  }, []);

  const handleContinueToDashboard = useCallback(() => {
    console.log("🏠 AuthFlow: Continuing to dashboard");
    router.push("/dashboard");
  }, [router]);

  const handleRemindLater = useCallback(() => {
    console.log("⏰ AuthFlow: Remind later selected");
    // TODO: Set a flag to remind user later
    router.push("/dashboard");
  }, [router]);

  // Show loading state while checking session or initializing
  if (status === "loading" || isInitializing || !hasInitialized) {
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
          ></div>
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
                margin: "0 0 8px 0",
              }}
            >
              Setting up your account...
            </h2>
            <p
              style={{
                color: "#6b7280",
                margin: 0,
                fontSize: "14px",
              }}
            >
              {status === "loading"
                ? "Authenticating..."
                : "Analyzing your profile..."}
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
