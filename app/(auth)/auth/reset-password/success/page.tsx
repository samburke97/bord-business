// app/reset-password/success/page.tsx
"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import Button from "@/components/ui/Button";
import styles from "../page.module.css";

function PasswordUpdatedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleBack = () => {
    router.push("/login");
  };

  const handleBackToLogin = () => {
    router.push("/login");
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
            title="Password Updated"
            description={`You have successfully changed your password for [email address]. You can can log into bord admin with your new details.`}
          />

          <div className={styles.buttonContainer}>
            <Button
              variant="primary-green"
              onClick={handleBackToLogin}
              fullWidth
            >
              Back to Log In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PasswordUpdatedPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div>Loading...</div>
        </div>
      }
    >
      <PasswordUpdatedContent />
    </Suspense>
  );
}
