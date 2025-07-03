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
      // Check if this is a business setup continuation
      const continueBusinessSetup =
        searchParams.get("continue_business_setup") === "true";

      // Check if user exists and route accordingly
      const response = await fetch("/api/auth/check-user-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to check user status");
      }

      const userData = await response.json();

      if (userData.exists && userData.isVerified) {
        // EXISTING USER FLOW
        if (continueBusinessSetup) {
          // For business setup continuation, go directly to password then business creation
          router.push(
            `/auth/password?email=${encodeURIComponent(email)}&type=login&name=${encodeURIComponent(userData.name || "")}&continue_business_setup=true`
          );
        } else {
          // Regular login flow
          router.push(
            `/auth/password?email=${encodeURIComponent(email)}&type=login&name=${encodeURIComponent(userData.name || "")}`
          );
        }
      } else {
        // NEW USER FLOW: Go directly to business setup (with password included)
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
