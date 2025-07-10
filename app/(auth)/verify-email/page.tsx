// app/(auth)/verify-email/page.tsx - Updated with CSS modules
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import EmailVerification from "@/components/auth/EmailVerification";
import styles from "./page.module.css";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleVerificationComplete = () => {
    console.log("✅ Email verification complete - showing congratulations");

    window.location.href = `/auth/congratulations`;
  };

  return (
    <EmailVerification
      email={email}
      onVerificationComplete={handleVerificationComplete}
    />
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div className={styles.loadingContent}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading verification...</p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
