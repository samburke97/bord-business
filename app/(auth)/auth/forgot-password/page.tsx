"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleBack = () => {
    router.back();
  };

  const validateEmail = (value: string) => {
    if (!value || value.trim() === "") {
      setEmailError("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }

    setEmailError(null);
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    setEmailError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email");
      }

      // Navigate to success page
      router.push(
        `/auth/forgot-password/sent?email=${encodeURIComponent(email)}`
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      setEmailError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError(null);
  };

  // Extract name from email for personalization
  const getName = () => {
    if (email && email.includes("@")) {
      return email.split("@")[0];
    }
    return "";
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
              <TitleDescription
                title={`Forgot your Password?`}
                description={`We'll send you a secure link to create a new password to ${email || ""}`}
              />

              <div className={styles.formFields}>
                <TextInput
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email address"
                  error={emailError}
                  required
                  autoFocus
                />
              </div>

              <Button
                variant="primary-green"
                onClick={handleResetPassword}
                disabled={isLoading || !email}
                fullWidth
              >
                {isLoading ? "Sending..." : "Reset Password"}
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

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div>Loading...</div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
