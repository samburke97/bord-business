// app/forgot-password/sent/page.tsx
"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function ResetEmailSentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [isResending, setIsResending] = useState(false);
  const [showSentConfirmation, setShowSentConfirmation] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  const handleResendCode = async () => {
    if (!email) return;

    setIsResending(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setShowSentConfirmation(true);
        // Hide the confirmation after 1 second
        setTimeout(() => {
          setShowSentConfirmation(false);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to resend email:", error);
    } finally {
      setIsResending(false);
    }
  };

  const getResendButtonText = () => {
    if (isResending) return "Resending...";
    if (showSentConfirmation) return "Reset Email Sent";
    return "Resend Code";
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.leftSection}>
          <ActionHeader
            type="back"
            secondaryAction={handleBack}
            constrained={false}
          />

          <div className={styles.formContainer}>
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
                    stroke="#000"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M20 32l8 8 16-16"
                    stroke="#000"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>

              <div className={styles.titleSection}>
                <h1 className={styles.title}>Reset Email Sent!</h1>
                <p className={styles.description}>
                  Please check your inbox to reset your password. If you didn't
                  receive your email, please check your junk mail folder.
                </p>
              </div>

              <Button
                variant="primary-green"
                onClick={handleBackToLogin}
                fullWidth
              >
                Back to log In
              </Button>

              <div className={styles.resendSection}>
                <button
                  onClick={handleResendCode}
                  disabled={isResending || showSentConfirmation}
                  className={styles.resendButton}
                >
                  {getResendButtonText()}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.imageContainer}>
          <Image
            src="/images/login/auth-bg.png"
            alt="Sports facility background"
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
      </div>
    </div>
  );
}

export default function ResetEmailSentPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div>Loading...</div>
        </div>
      }
    >
      <ResetEmailSentContent />
    </Suspense>
  );
}
