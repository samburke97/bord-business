// components/auth/AuthFlowManager.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import EmailVerification from "./EmailVerification";
import BusinessSetupForm from "./BusinessSetupForm";
import Congratulations from "./Congratulations";

type FlowStep = "verification" | "setup" | "complete";

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

  // Memoize the business status check to prevent re-renders
  const checkBusinessStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/user/business-status");
      const data = await response.json();

      if (data.needsSetup) {
        setCurrentStep("setup");
      } else {
        // User is fully set up, redirect to dashboard
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error checking business status:", error);
      // Default to setup step if we can't determine status
      setCurrentStep("setup");
    }
  }, [router]);

  // Send initial verification code when component mounts
  useEffect(() => {
    if (hasInitialized) return; // Prevent multiple calls

    const sendInitialCode = async () => {
      if (!email) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth/send-verification-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "Failed to send initial verification code:",
            errorData.message
          );
        }
      } catch (error) {
        console.error("Error sending initial verification code:", error);
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

    // If user is already authenticated and has completed setup
    if (session?.user && session.user.isVerified) {
      checkBusinessStatus();
      return;
    }

    // If no email provided, redirect back to login
    if (!email) {
      router.push("/login");
      return;
    }

    // Stay on verification step by default
    if (currentStep === "verification") {
      // Don't change anything, user is on verification step
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

  const handleVerificationComplete = useCallback(() => {
    setCurrentStep("setup");
  }, []);

  const handleSetupComplete = useCallback(() => {
    setCurrentStep("complete");
  }, []);

  const handleContinueToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleRemindLater = useCallback(() => {
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
      return null;
  }
}
