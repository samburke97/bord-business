// app/(auth)/signup/verify-email/sent/page.tsx
"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/layouts/AuthLayout";
import TitleDescription from "@/components/ui/TitleDescription";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function VerificationSentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleBack = () => {
    router.back();
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  return (
    <AuthLayout showBackButton={true} onBackClick={handleBack}>
      <div className={styles.formWrapper}>
        <div className={styles.checkIcon}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            className={styles.checkSvg}
          >
            <circle
              cx="32"
              cy="32"
              r="30"
              stroke="#059669"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M20 32l8 8 16-16"
              stroke="#059669"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>

        <div className={styles.titleSection}>
          <TitleDescription
            title="Check your email"
            description={`We've sent a verification code to ${email}. Please check your inbox and enter the code to continue.`}
          />
        </div>

        <Button variant="primary-green" onClick={handleBackToLogin} fullWidth>
          Back to Sign In
        </Button>
      </div>
    </AuthLayout>
  );
}

export default function VerificationSentPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div>Loading...</div>
        </div>
      }
    >
      <VerificationSentContent />
    </Suspense>
  );
}
