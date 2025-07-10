// app/(auth)/auth/error/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const email = searchParams.get("email");

  const handleBack = () => {
    window.history.back();
  };

  const getErrorContent = () => {
    switch (error) {
      case "AccountExistsWithDifferentMethod":
      case "AccountExistsWithDifferentProvider":
        return {
          title: "Account Already Exists",
          description: `An account with this email address already exists. Please sign in using your existing account.`,
          icon: (
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              className={styles.errorSvg}
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
                d="M32 20v16M32 44h.01"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
          actions: (
            <div className={styles.buttonContainer}>
              <Button
                variant="primary-green"
                onClick={() => (window.location.href = "/login")}
                fullWidth
              >
                Back to Sign In
              </Button>
            </div>
          ),
        };

      case "OAuthAccountNotLinked":
        return {
          title: "Account Not Linked",
          description:
            "This account is not linked to your existing account. Please sign in with your original method.",
          icon: (
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              className={styles.errorSvg}
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
                d="M20 32h24M32 20l12 12-12 12"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
          actions: (
            <div className={styles.buttonContainer}>
              <Button
                variant="primary-green"
                onClick={() => (window.location.href = "/login")}
                fullWidth
              >
                Back to Sign In
              </Button>
            </div>
          ),
        };

      default:
        return {
          title: "Authentication Error",
          description: "There was a problem signing you in. Please try again.",
          icon: (
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              className={styles.errorSvg}
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
                d="M20 20l24 24M44 20L20 44"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
          actions: (
            <div className={styles.buttonContainer}>
              <Button
                variant="primary-green"
                onClick={() => (window.location.href = "/login")}
                fullWidth
              >
                Back to Sign In
              </Button>
            </div>
          ),
        };
    }
  };

  const { title, description, icon, actions } = getErrorContent();

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
              <div className={styles.iconContainer}>{icon}</div>

              <div className={styles.titleSection}>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.description}>{description}</p>
              </div>

              {actions}
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

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div>Loading...</div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
