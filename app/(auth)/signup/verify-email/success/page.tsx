// app/(auth)/signup/verify-email/success/page.tsx
"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/layouts/AuthLayout";
import TitleDescription from "@/components/ui/TitleDescription";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function VerificationSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleBack = () => {
    router.push("/login");
  };

  const handleContinue = () => {
    router.push("/business/onboarding");
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
            title="Email Verified!"
            description={`Your email ${email} has been successfully verified. You can now continue setting up your business.`}
          />
        </div>

        <Button
          variant="primary-green"
          onClick={handleContinue}
          fullWidth
        >
          Continue to Business Setup
        </Button>
      </div>
    </AuthLayout>
  );
}

export default function VerificationSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div>Loading...</div>
        </div>
      }
    >
      <VerificationSuccessContent />
    </Suspense>
  );
}
