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
      if (status === "loading") {
        return;
      }

      // PRIORITY 1: Check URL path first to determine intended step
      const pathname = window.location.pathname;

      // If we're explicitly on /auth/setup, show setup form regardless of method
      if (pathname === "/auth/setup") {
        if (authMethod === "oauth" && session?.user) {
          // OAuth users on setup page
          setCurrentStep("setup");
          setUserInfo({
            isNewUser: false,
            userName: session.user.name || undefined,
          });
          setEmail(session.user.email || "");
        } else {
          // Email users on setup page (new user flow)
          setCurrentStep("setup");
          setUserInfo({
            isNewUser: true,
            userName: undefined,
          });
        }
        setIsInitializing(false);
        return;
      }

      // If we're explicitly on verification pages, show verification
      if (pathname === "/auth/verify" || pathname === "/signup/verify-email") {
        setCurrentStep("verification");
        setUserInfo({
          isNewUser: true,
          userName: undefined,
        });
        setIsInitializing(false);
        return;
      }

      // If we're on password page, show password screen
      if (pathname === "/auth/password") {
        const type = searchParams.get("type");
        const name = searchParams.get("name");
        setCurrentStep("password");
        setUserInfo({
          isNewUser: type === "setup",
          userName: name || undefined,
        });
        setIsInitializing(false);
        return;
      }

      // PRIORITY 2: Method-based logic for flows without explicit paths

      // OAuth method - go to profile setup
      if (authMethod === "oauth") {
        setCurrentStep("setup");
        setUserInfo({
          isNewUser: false,
          userName: session?.user?.name || undefined,
        });
        setEmail(session?.user?.email || "");
        setIsInitializing(false);
        return;
      }

      // Email method - determine next step based on context
      if (authMethod === "email") {
        // For email method, we need to determine if this is a new signup
        // or returning to continue a flow.
        // Default to setup for new users.
        setCurrentStep("setup");
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
        // Changed: Default to setup instead of verification for new email users
        setCurrentStep("setup");
        setUserInfo({
          isNewUser: true,
          userName: undefined,
        });
        setIsInitializing(false);
        return;
      }

      // FALLBACK: No session and no email - redirect to login
      router.push("/login");
    };

    initializeFlow();
  }, [session, status, email, router, authMethod]);

  const handleVerificationComplete = useCallback(
    (data: { isExistingUser: boolean }) => {
      setUserInfo({
        isNewUser: !data.isExistingUser,
        userName: userInfo.userName,
      });

      setCurrentStep("password");
    },
    [userInfo.userName]
  );

  const handlePasswordComplete = useCallback(() => {
    if (userInfo.isNewUser) {
      setCurrentStep("setup");
    } else {
      // Existing user - redirect to dashboard or business setup
      router.push("/dashboard");
    }
  }, [userInfo.isNewUser, router]);

  const handleSetupComplete = useCallback(async () => {
    // For email users, send verification code then redirect to verification
    if (authMethod === "email" || (!session?.user && email)) {
      try {
        // Send verification code automatically
        const response = await fetch("/api/auth/send-verification-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          // Code sent successfully, redirect to verification
          router.push(`/signup/verify-email?email=${encodeURIComponent(email)}`);
        } else {
          // Failed to send code, show error or retry
          console.error("Failed to send verification code");
          // You might want to show an error message to the user here
          // For now, still redirect but user will need to hit resend
          router.push(`/signup/verify-email?email=${encodeURIComponent(email)}`);
        }
      } catch (error) {
        console.error("Error sending verification code:", error);
        // Still redirect, user can hit resend
        router.push(`/signup/verify-email?email=${encodeURIComponent(email)}`);
      }
    } else {
      // For OAuth users, show congratulations step
      setCurrentStep("complete");
    }
  }, [router, authMethod, session, email]);

  // FIXED: Updated callback names to match master component
  const handleCongratulationsContinue = useCallback(() => {
    router.push("/business/onboarding");
  }, [router]);

  const handleCongratulationsRemindLater = useCallback(() => {
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
              Setting up your account...
            </h2>
            <p
              style={{
                color: "#6b7280",
                margin: 0,
                fontSize: "14px",
              }}
            >
              Please wait while we prepare your profile...
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
          isNewUser={userInfo.isNewUser}
          userName={userInfo.userName}
          onPasswordComplete={handlePasswordComplete}
        />
      );

    case "setup":
      return (
        <BusinessSetupForm
          email={email}
          isOAuth={!!session?.user}
          onSetupComplete={handleSetupComplete}
        />
      );

    case "complete":
      return (
        <Congratulations
          title="Congratulations!"
          description="Let's complete your player account setup or you can come back to it later."
          primaryButtonText="Continue"
          secondaryButtonText="Remind me Later"
          onContinue={handleCongratulationsContinue}
          onRemindLater={handleCongratulationsRemindLater}
        />
      );

    default:
      return null;
  }
}
