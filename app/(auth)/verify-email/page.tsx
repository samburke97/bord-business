// app/(auth)/verify-email/page.tsx - Email verification with proper flow
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import EmailVerification from "@/components/auth/EmailVerification";
import styles from "./page.module.css"; // Preserve existing styles

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";

  if (!email) {
    // Redirect back to login if no email
    router.push("/login");
    return null;
  }

  const handleVerificationComplete = () => {
    router.push("/auth/congratulations");
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
