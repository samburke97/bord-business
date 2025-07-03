// app/(auth)/auth/congratulations/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Congratulations from "@/components/auth/Congratulations";

export default function CongratulationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Get email from URL params if available (passed from verification)
  const email = searchParams.get("email") || "";

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      // Simply redirect to business onboarding
      // Made it public in middleware for testing
      router.push("/business-onboarding");
    } catch (error) {
      console.error("Continue error:", error);
      router.push("/business-onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemindLater = () => {
    // Route back to bord-player app like in login form
    window.location.href = "https://bord-player.vercel.app/";
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        Preparing business setup...
      </div>
    );
  }

  return (
    <Congratulations
      onContinue={handleContinue}
      onRemindLater={handleRemindLater}
    />
  );
}
