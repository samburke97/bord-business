// app/forgot-password/sent/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function ResetEmailSentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  const handleResendCode = async () => {
    if (!email) return;

    setIsResending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage("Reset email sent successfully!");
      } else {
        setMessage("Failed to resend email. Please try again.");
      }
    } catch (error) {
      setMessage("Failed to resend email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <ActionHeader
        type="back"
        secondaryAction={handleBack}
        className={styles.headerOverlay}
      />

      <div className={styles.content}>
        <div className={styles.formContainer}>
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

          <TitleDescription
            title="Reset Email Sent!"
            description="Please check your inbox to reset your password. If you didn't receive your email, please check your junk mail folder."
          />

          {message && (
            <div className={styles.message}>
              <p>{message}</p>
            </div>
          )}

          <div className={styles.buttonContainer}>
            <Button
              variant="primary-green"
              onClick={handleBackToLogin}
              fullWidth
            >
              Back to log In
            </Button>

            <Button
              variant="secondary"
              onClick={handleResendCode}
              disabled={isResending}
              fullWidth
            >
              {isResending ? "Resending..." : "Resend Code"}
            </Button>
          </div>
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
