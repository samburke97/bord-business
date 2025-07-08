// app/(auth)/auth/congratulations/page.tsx - FIXED - Route to business onboarding
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
      // CRITICAL FIX: This should go to business onboarding, not dashboard
      console.log("🏗️ Congratulations: Redirecting to business onboarding");
      router.push("/business-onboarding");
    } catch (error) {
      console.error("❌ Congratulations: Continue error:", error);
      // Fallback to business onboarding
      router.push("/business-onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemindLater = () => {
    // Route back to bord-player app like in login form
    console.log("⏰ Congratulations: Remind later selected");
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
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e5e7eb",
              borderTop: "4px solid #10b981",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#6b7280", margin: 0 }}>
            Preparing business setup...
          </p>
        </div>
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
