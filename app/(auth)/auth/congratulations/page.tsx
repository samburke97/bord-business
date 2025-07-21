// app/(auth)/auth/congratulations/page.tsx - Fixed congratulations flow
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import Button from "@/components/ui/Button";
import styles from "./page.module.css"; // Preserve existing styles

export default function CongratulationsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleContinue = () => {
    console.log("🎉 Congratulations: Continue to business onboarding");
    setIsLoading(true);
    router.push("/business-onboarding");
  };

  const handleRemindLater = () => {
    console.log("⏰ Congratulations: Remind later - go to dashboard");
    setIsLoading(true);
    router.push("/dashboard");
  };

  return (
    <div className={styles.container}>
      <ActionHeader
        type="back"
        secondaryAction={handleBack}
        constrained={false}
      />

      <div className={styles.content}>
        <div className={styles.celebrationSection}>
          {/* Success Icon */}
          <div className={styles.iconContainer}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              className={styles.successIcon}
            >
              <circle
                cx="40"
                cy="40"
                r="38"
                fill="#10B981"
                stroke="#059669"
                strokeWidth="2"
              />
              <path
                d="M25 40l10 10 20-20"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Congratulations Text */}
          <div className={styles.messageSection}>
            <h1 className={styles.title}>Congratulations!</h1>
            <p className={styles.description}>
              Your email has been successfully verified and your account is now
              active. You're ready to start setting up your business profile.
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
              {isLoading ? "Loading..." : "Continue to Business Setup"}
            </Button>

            <Button
              variant="secondary"
              onClick={handleRemindLater}
              disabled={isLoading}
              fullWidth
            >
              Skip for Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
