// app/(auth)/auth/congratulations/page.tsx - Updated with CSS modules
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

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
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Preparing business setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.formContainer}>
          {/* Checkmark Icon */}
          <div className={styles.iconContainer}>
            <div className={styles.checkmarkIcon}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M26.6667 8L12 22.6667L5.33337 16"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Title and Description */}
          <div className={styles.textSection}>
            <h1 className={styles.title}>Congratulations</h1>
            <p className={styles.description}>
              Let's Complete your player account setup
              <br />
              or you can come back to it later.
            </p>
          </div>

          {/* Buttons */}
          <div className={styles.buttonContainer}>
            <Button
              variant="primary-green"
              onClick={handleContinue}
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? "Loading..." : "Continue"}
            </Button>

            <Button
              variant="secondary"
              onClick={handleRemindLater}
              disabled={isLoading}
              fullWidth
            >
              Remind me Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
