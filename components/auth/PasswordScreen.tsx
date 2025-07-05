// components/auth/PasswordScreen.tsx - FIXED LOGIN FLOW
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import ActionHeader from "../layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";
import styles from "./PasswordScreen.module.css";

interface PasswordScreenProps {
  email: string;
  userName?: string;
  isNewUser: boolean;
  onPasswordComplete: () => void;
}

export default function PasswordScreen({
  email,
  userName,
  isNewUser,
  onPasswordComplete,
}: PasswordScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    router.back();
  };

  const validatePassword = () => {
    if (!password) {
      setError("Password is required");
      return false;
    }

    if (isNewUser) {
      // Use the secure password validation for new users
      if (password.length < 12) {
        setError("Password must be at least 12 characters long");
        return false;
      }

      if (!/[A-Z]/.test(password)) {
        setError("Password must contain at least one uppercase letter");
        return false;
      }

      if (!/[a-z]/.test(password)) {
        setError("Password must contain at least one lowercase letter");
        return false;
      }

      if (!/\d/.test(password)) {
        setError("Password must contain at least one number");
        return false;
      }

      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        setError("Password must contain at least one special character");
        return false;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if this is a business setup continuation
      const continueBusinessSetup =
        searchParams.get("continue_business_setup") === "true";

      if (isNewUser) {
        console.log("👤 New user: Setting password...");

        // For new users, save the password and continue to setup
        const response = await fetch("/api/auth/set-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to set password");
        }

        console.log("✅ Password set successfully");
        onPasswordComplete();
      } else {
        console.log("🔐 Existing user: Signing in...");

        // CRITICAL FIX: Use callbackUrl to ensure proper redirect
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false, // Important: don't let NextAuth handle redirect
          callbackUrl: continueBusinessSetup
            ? "/business-onboarding"
            : "/dashboard",
        });

        if (result?.error) {
          console.error("❌ Sign-in error:", result.error);
          setError("Invalid password. Please try again.");
          return;
        }

        if (result?.ok) {
          console.log("✅ Sign-in successful, redirecting...");

          // CRITICAL FIX: Force redirect after successful login
          // Don't rely on NextAuth's redirect handling
          if (continueBusinessSetup) {
            console.log("🏗️ Redirecting to business onboarding...");
            window.location.href = "/business-onboarding";
          } else {
            console.log("🏠 Redirecting to dashboard...");
            window.location.href = "/dashboard";
          }
        }
      }
    } catch (error) {
      console.error("❌ Password error:", error);
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Navigate to the correct auth route
    router.push(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
  };

  const getTitle = () => {
    if (isNewUser) {
      return "Set Your Password";
    }
    return userName ? `Welcome back, ${userName}!` : "Welcome back!";
  };

  const getDescription = () => {
    if (isNewUser) {
      return "Create a secure password for your account.";
    }
    return "Enter your password to continue.";
  };

  return (
    <div className={styles.container}>
      <ActionHeader onBack={handleBack} />

      <div className={styles.content}>
        <TitleDescription title={getTitle()} description={getDescription()} />

        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <TextInput
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onEnter={handleSubmit}
              autoComplete={isNewUser ? "new-password" : "current-password"}
              required
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {isNewUser && (
            <div className={styles.inputGroup}>
              <TextInput
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onEnter={handleSubmit}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            fullWidth
            className={styles.submitButton}
          >
            {isLoading
              ? "Processing..."
              : isNewUser
                ? "Set Password"
                : "Sign In"}
          </Button>

          {!isNewUser && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className={styles.forgotPasswordLink}
            >
              Forgot your password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
