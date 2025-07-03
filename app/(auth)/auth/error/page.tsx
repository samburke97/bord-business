// app/(auth)/auth/error/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const email = searchParams.get("email");
  const provider = searchParams.get("provider");

  const handleBack = () => {
    window.history.back();
  };

  const getErrorContent = () => {
    switch (error) {
      case "AccountExistsWithDifferentProvider":
        return {
          title: "Account Already Exists",
          description: `An account with the email ${email} already exists. Please sign in using the method you originally used to create your account.`,
          icon: "⚠️",
          actions: (
            <div className={styles.actions}>
              <Button
                variant="primary-green"
                onClick={() => (window.location.href = "/login")}
                fullWidth
              >
                Sign in with Email
              </Button>
              <Button variant="secondary" onClick={handleBack} fullWidth>
                Try Different Account
              </Button>
            </div>
          ),
        };

      case "OAuthAccountNotLinked":
        return {
          title: "Account Not Linked",
          description:
            "This account is not linked to your existing account. Please sign in with your original method.",
          icon: "🔗",
          actions: (
            <div className={styles.actions}>
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
          icon: "❌",
          actions: (
            <div className={styles.actions}>
              <Button
                variant="primary-green"
                onClick={() => (window.location.href = "/login")}
                fullWidth
              >
                Try Again
              </Button>
            </div>
          ),
        };
    }
  };

  const errorContent = getErrorContent();

  return (
    <div className={styles.container}>
      <ActionHeader
        type="back"
        secondaryAction={handleBack}
        className={styles.headerOverlay}
      />

      <div className={styles.content}>
        <div className={styles.errorContainer}>
          <div className={styles.iconContainer}>
            <span className={styles.icon}>{errorContent.icon}</span>
          </div>

          <TitleDescription
            title={errorContent.title}
            description={errorContent.description}
          />

          {email && (
            <div className={styles.emailInfo}>
              <p className={styles.emailText}>
                Email: <span className={styles.emailHighlight}>{email}</span>
              </p>
              {provider && (
                <p className={styles.providerText}>
                  Attempted with:{" "}
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </p>
              )}
            </div>
          )}

          {errorContent.actions}

          <div className={styles.helpText}>
            <p>
              Need help?{" "}
              <Link href="/support" className={styles.helpLink}>
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
