// app/reset-password/success/page.tsx
"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

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
                <h1 className={styles.title}>Password Updated</h1>
                <p className={styles.description}>
                  You have successfully changed your password for{" "}
                  {email || "[email address]"}. You can can log into bord admin
                  with your new details.
                </p>
              </div>

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
