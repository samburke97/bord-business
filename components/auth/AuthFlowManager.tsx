// components/auth/AuthFlowManager.tsx - FIXED WITH SECURITY BEST PRACTICES
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
        setCurrentStep("setup");
      } else {
        console.log(
          "✅ AuthFlow: User is fully set up, redirecting to dashboard"
        );
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("❌ AuthFlow: Error checking business status:", error);
      // Default to setup step if we can't determine status
      console.log("🔄 AuthFlow: Defaulting to setup step due to error");
      setCurrentStep("setup");
    }
  }, [router]);

  // Send initial verification code when component mounts
  useEffect(() => {
    if (hasInitialized) return; // Prevent multiple calls

    const sendInitialCode = async () => {
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

          // FIXED: Removed the incorrect negation
          setUserInfo({
            isNewUser: data.isNewUser || false, // Use the correct value from API
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

    if (email) {
      sendInitialCode();
    } else {
      setIsInitializing(false);
      setHasInitialized(true);
    }
  }, [email, router, hasInitialized]);

  // Check session and route user appropriately
  useEffect(() => {
    if (status === "loading" || isInitializing || !hasInitialized) return;

    console.log("🔐 AuthFlow: Session status:", status, "Session:", !!session);

    // If user is already authenticated and has completed setup
    if (session?.user && session.user.isVerified) {
      console.log("✅ AuthFlow: User is authenticated and verified");
      checkBusinessStatus();
      return;
    }

    // If no email provided, redirect back to login
    if (!email) {
      console.log("❌ AuthFlow: No email provided, redirecting to login");
      router.push("/login");
      return;
    }

    // Stay on verification step by default
    if (currentStep === "verification") {
      console.log("📧 AuthFlow: Staying on verification step");
      return;
    }
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
        }}
      >
        <div>Loading...</div>
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
          email={email}
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
      return null;
  }
}
