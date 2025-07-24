// components/auth/LoginForm.tsx - ONLY routing changes, ALL styling preserved
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Image from "next/image";
import ActionHeader from "../layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";
import styles from "./LoginForm.module.css";

interface LoginFormProps {
  title: string;
  description: string;
}

export default function LoginForm({ title, description }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Get reCAPTCHA token
  const getReCaptchaToken = async (action: string): Promise<string | null> => {
    if (!executeRecaptcha) {
      return null;
    }

    try {
      const token = await executeRecaptcha(action);
      return token;
    } catch (error) {
      console.error("reCAPTCHA execution failed:", error);
      return null;
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);

      // Generate reCAPTCHA token for Google sign-in
      const recaptchaToken = await getReCaptchaToken("google_signin");
      if (!recaptchaToken) {
        setGeneralError("Security verification failed. Please try again.");
        return;
      }

      await signIn("google", {
        callbackUrl: "/auth/oauth/setup",
      });
    } catch (error) {
      console.error("Google sign in error:", error);
      setGeneralError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      setIsLoading(true);

      // Generate reCAPTCHA token for Facebook sign-in
      const recaptchaToken = await getReCaptchaToken("facebook_signin");
      if (!recaptchaToken) {
        setGeneralError("Security verification failed. Please try again.");
        return;
      }

      // ✅ FIXED: Route OAuth users to dedicated OAuth flow
      await signIn("facebook", {
        callbackUrl: "/auth/oauth/setup",
      });
    } catch (error) {
      console.error("Facebook sign in error:", error);
      setGeneralError("Failed to sign in with Facebook. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setGeneralError(null);
  };

  const handleEmailContinue = async () => {
    if (!email.trim()) {
      setGeneralError("Please enter your email address.");
      return;
    }

    if (!validateEmail(email)) {
      setGeneralError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setGeneralError(null);

    try {
      // Generate reCAPTCHA token for email continue
      const recaptchaToken = await getReCaptchaToken("email_continue");
      if (!recaptchaToken) {
        setGeneralError("Security verification failed. Please try again.");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth/check-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          recaptchaToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check user status");
      }

      const userData = await response.json();

      // 🔍 DEBUG: Log what the API returns
      console.log("User data from check-user-status:", {
        exists: userData.exists,
        methods: userData.methods,
        hasCredentials: userData.hasCredentials,
        hasPasswordHash: userData.hasPasswordHash,
        providers: userData.providers,
      });

      if (userData.exists) {
        const methods = userData.methods || [];

        // 🔍 DEBUG: Log the decision logic
        console.log("Decision logic:", {
          methods,
          includesEmail: methods.includes("email"),
          methodsLength: methods.length,
          shouldRedirectToError:
            !methods.includes("email") && methods.length > 0,
        });

        // If user exists but DOES NOT have email credentials and has other methods, redirect to error page
        if (!methods.includes("email") && methods.length > 0) {
          console.log("🚨 Redirecting to error page");
          router.push(
            `/auth/error?error=AccountExistsWithDifferentMethod&email=${encodeURIComponent(
              email
            )}&available=${methods.join(",")}&attempted=email`
          );
          return;
        }

        console.log("✅ Proceeding to password page");
        // User has email credentials - continue to password screen
        router.push(
          `/auth/password?email=${encodeURIComponent(email)}&type=login&name=${encodeURIComponent(
            userData.name || ""
          )}`
        );
      } else {
        console.log("🆕 User doesn't exist, going to email setup");
        // ✅ FIXED: Route new email users to dedicated email flow
        router.push(`/auth/email/setup?email=${encodeURIComponent(email)}`);
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
