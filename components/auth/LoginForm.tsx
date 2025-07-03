// components/auth/LoginForm.tsx (Option 2 Flow)
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
        // Existing verified user → Password login screen
        router.push(
          `/auth/password?email=${encodeURIComponent(email)}&type=login&name=${encodeURIComponent(userData.name || "")}`
        );
      } else {
        // New user or unverified user → Password setup screen
        router.push(
          `/auth/password?email=${encodeURIComponent(email)}&type=setup`
        );
      }
    } catch (error) {
      console.error("Email continue error:", error);
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(null);
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
        {/* Left side: Login Form */}
        <div className={styles.formContainer}>
          <div className={styles.formWrapper}>
            <TitleDescription title={title} description={description} />

            {/* Social Login Buttons */}
            <div className={styles.authButtons}>
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className={styles.socialButton}
              >
                <Image
                  src="/icons/login/google.svg"
                  alt="Google"
                  width={32}
                  height={32}
                  unoptimized={true}
                  style={{ width: "auto", height: "auto" }}
                />
                <span className={styles.buttonText}>Continue with Google</span>
              </button>

              <button
                onClick={handleFacebookSignIn}
                disabled={isLoading}
                className={styles.socialButton}
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

            {/* Divider */}
            <div className={styles.divider}>
              <span>OR</span>
            </div>

            {/* Email Form */}
            <div className={styles.emailForm}>
              <TextInput
                id="email"
                label=""
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter email address"
                error={emailError}
                type="email"
                autoComplete="email"
              />

              <div className={styles.continueButtonContainer}>
                <Button
                  variant="primary-green"
                  onClick={handleEmailContinue}
                  disabled={isLoading || !email}
                  fullWidth
                >
                  {isLoading ? "Loading..." : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Hero image */}
        <div className={styles.imageContainer}>
          <Image
            src="/images/login/login-hero.png"
            alt="Basketball players"
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
      </div>
    </div>
  );
}
