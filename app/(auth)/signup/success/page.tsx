// app/(auth)/signup/success/page.tsx
"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/layouts/AuthLayout";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function SignupSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleBack = () => {
    router.push("/login");
  };

  const handleContinueToOnboarding = () => {
    router.push("/business/onboarding");
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
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
          <h1 className={styles.title}>Welcome to Bord!</h1>
          <p className={styles.description}>
            Your account has been successfully created{email && ` for ${email}`}
            . You can now start setting up your business or explore the
            dashboard.
          </p>
        </div>

        <div className={styles.buttonGroup}>
          <Button
            variant="primary-green"
            onClick={handleContinueToOnboarding}
            fullWidth
          >
            Set Up Your Business
          </Button>

          <Button variant="secondary" onClick={handleGoToDashboard} fullWidth>
            Explore Dashboard
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div>Loading...</div>
        </div>
      }
    >
      <SignupSuccessContent />
    </Suspense>
  );
}
