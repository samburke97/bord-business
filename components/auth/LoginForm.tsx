// components/auth/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ActionHeader from "../layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";
import styles from "./LoginForm.module.css";

interface LoginFormProps {
  accountType: "player" | "business";
  title: string;
  description: string;
  callbackUrl: string;
}

export default function LoginForm({
  accountType,
  title,
  description,
  callbackUrl,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleBack = () => {
    // Route back to the main player app
    window.location.href = "https://bord-player.vercel.app/";
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", {
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("facebook", {
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Facebook sign-in error:", error);
    } finally {
      setIsLoading(false);
    }
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

  const handleEmailContinue = async () => {
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    setEmailError(null);

    try {
      const continueBusinessSetup =
        searchParams.get("continue_business_setup") === "true";

      const response = await fetch("/api/auth/check-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to check user status");
      }

      const userData = await response.json();

      if (userData.exists) {
        const methods = userData.methods || [];

        // If user exists but DOES NOT have email credentials and has other methods, redirect to error page
        if (!methods.includes("email") && methods.length > 0) {
          router.push(
            `/auth/error?error=AccountExistsWithDifferentMethod&email=${encodeURIComponent(
              email
            )}&available=${methods.join(",")}&attempted=email`
          );
          return;
        }

        // User has email credentials - continue normal flow
        if (continueBusinessSetup) {
          router.push(
            `/auth/password?email=${encodeURIComponent(email)}&type=login&name=${encodeURIComponent(
              userData.name || ""
            )}&continue_business_setup=true`
          );
        } else {
          router.push(
            `/auth/password?email=${encodeURIComponent(email)}&type=login&name=${encodeURIComponent(
              userData.name || ""
            )}`
          );
        }
      } else {
        // New user - go to setup
        router.push(`/auth/setup?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      console.error("Email continue error:", error);
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
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
          <div className={styles.formWrapper}>
            <TitleDescription title={title} description={description} />

            <div className={styles.authButtons}>
              <button
                className={styles.socialButton}
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Image
                  src="/icons/login/google.svg"
                  alt="Google"
                  width={20}
                  height={20}
                />
                <span className={styles.buttonText}>Continue with Google</span>
              </button>

              <button
                className={styles.socialButton}
                onClick={handleFacebookSignIn}
                disabled={isLoading}
              >
                <Image
                  src="/icons/login/facebook.svg"
                  alt="Facebook"
                  width={20}
                  height={20}
                />
                <span className={styles.buttonText}>
                  Continue with Facebook
                </span>
              </button>
            </div>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <div className={styles.emailForm}>
              <TextInput
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                error={emailError}
                required
              />

              <div className={styles.continueButtonContainer}>
                <Button
                  variant="primary-green"
                  onClick={handleEmailContinue}
                  disabled={isLoading || !email}
                  fullWidth
                >
                  {isLoading ? "Checking..." : "Continue"}
                </Button>
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
