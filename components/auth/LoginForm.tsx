// components/auth/LoginForm.tsx
"use client";

import { useState, ChangeEvent } from "react";
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
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleBack = () => {
    // Route back to the main player app
    window.location.href = "https://bord-player.vercel.app/";
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setGeneralError(null);
    try {
      await signIn("google", {
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setGeneralError(
        "Something went wrong with Google sign-in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    setGeneralError(null);
    try {
      await signIn("facebook", {
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Facebook sign-in error:", error);
      setGeneralError(
        "Something went wrong with Facebook sign-in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return false;
    }
    return true;
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);

    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleEmailContinue = async () => {
    if (!email || email.trim() === "") {
      setGeneralError("Please choose at least one sign in option.");
      return;
    }

    if (!validateEmail(email)) {
      setGeneralError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setGeneralError(null);

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
      setGeneralError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
                    width={32}
                    height={32}
                  />
                  <span className={styles.buttonText}>
                    Continue with Google
                  </span>
                </button>

                <button
                  className={styles.socialButton}
                  onClick={handleFacebookSignIn}
                  disabled={isLoading}
                >
                  <Image
                    src="/icons/login/facebook.svg"
                    alt="Facebook"
                    width={32}
                    height={32}
                  />
                  <span className={styles.buttonText}>
                    Continue with Facebook
                  </span>
                </button>
              </div>

              <div className={styles.divider}>
                <span>OR</span>
              </div>

              <div className={styles.emailForm}>
                <TextInput
                  id="email"
                  label=""
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email address"
                  error={null}
                  required
                />
              </div>
              <Button
                variant="primary-green"
                onClick={handleEmailContinue}
                disabled={isLoading}
                fullWidth
                size="lg"
              >
                Continue
              </Button>

              {generalError && (
                <div className={styles.generalError}>{generalError}</div>
              )}
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
