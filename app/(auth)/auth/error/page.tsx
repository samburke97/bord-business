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
  const available = searchParams.get("available");
  const attempted = searchParams.get("attempted");

  const handleBack = () => {
    window.history.back();
  };

  const getErrorContent = () => {
    switch (error) {
      case "AccountExistsWithDifferentMethod":
        const availableMethods = available?.split(",") || [];
        const methodNames = {
          email: "Email & Password",
          google: "Google",
          facebook: "Facebook",
        };

        return {
          title: "Account Already Exists",
          description: `An account with ${email} already exists. Please sign in using one of your existing methods.`,
          icon: "👤",
          content: (
            <div className={styles.existingMethods}>
              <p className={styles.subtitle}>Your existing sign-in methods:</p>
              <ul className={styles.methodsList}>
                {availableMethods.map((method) => (
                  <li key={method} className={styles.methodItem}>
                    <span className={styles.methodIcon}>
                      {method === "email" && "📧"}
                      {method === "google" && "🔍"}
                      {method === "facebook" && "📘"}
                    </span>
                    {methodNames[method as keyof typeof methodNames] || method}
                  </li>
                ))}
              </ul>
            </div>
          ),
          actions: (
            <div className={styles.actions}>
              <Button
                variant="primary-green"
                onClick={() => (window.location.href = "/login")}
                fullWidth
              >
                Go to Sign In
              </Button>
              <Button variant="secondary" onClick={handleBack} fullWidth>
                Try Different Email
              </Button>
            </div>
          ),
        };

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
                Back to Sign In
              </Button>
            </div>
          ),
        };
    }
  };

  const { title, description, icon, content, actions } = getErrorContent();

  return (
    <div className={styles.container}>
      <ActionHeader
        type="back"
        secondaryAction={handleBack}
        className={styles.headerOverlay}
      />

      <div className={styles.content}>
        <div className={styles.formContainer}>
          <div className={styles.icon}>{icon}</div>

          <TitleDescription
            title={title}
            description={description}
            className={styles.centerText}
          />

          {content && <div className={styles.extraContent}>{content}</div>}

          {actions}
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
