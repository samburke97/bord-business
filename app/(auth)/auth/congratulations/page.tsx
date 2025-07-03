// app/(auth)/auth/congratulations/page.tsx (FIXED FOR EXISTING BUSINESS FLOW)
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
      // Since the user just created their account and verified email,
      // we need to sign them in automatically to access the business creation flow

      // Attempt to sign in the user with their credentials
      // We'll redirect them to a special sign-in page that handles this flow
      router.push(
        `/login?continue_business_setup=true&email=${encodeURIComponent(email)}`
      );
    } catch (error) {
      console.error("Continue error:", error);
      // Fallback to regular login
      router.push("/login");
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
