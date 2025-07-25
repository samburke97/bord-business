"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/layouts/AuthLayout";
import EmailVerification from "@/components/auth/EmailVerification";
import styles from "./page.module.css";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";

  if (!email) {
    router.push("/login");
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const handleVerificationComplete = () => {
    router.push("/signup/success");
  };

  return (
    <AuthLayout showBackButton={true} onBackClick={handleBack}>
      <EmailVerification
        email={email}
        onVerificationComplete={handleVerificationComplete}
      />
    </AuthLayout>
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
