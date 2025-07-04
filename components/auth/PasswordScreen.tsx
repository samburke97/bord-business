// components/auth/PasswordScreen.tsx - FIXED WITH SECURITY BEST PRACTICES
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

      if (/(.)\1{2,}/.test(password)) {
        setError("Password cannot contain three or more repeating characters");
        return false;
      }

      if (/123|abc|qwerty|password|admin|login/i.test(password)) {
        setError("Password cannot contain common patterns or words");
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

  // Function to check if user needs business onboarding
  const checkBusinessStatus = async () => {
    try {
      console.log("🔍 Checking business status for user...");

      const response = await fetch("/api/user/business-status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for session cookies
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 Business status response:", data);

      if (data.needsSetup) {
        console.log("🏗️ User needs business setup, redirecting...");
        router.push("/business-onboarding");
      } else {
        console.log("✅ User setup complete, redirecting to dashboard...");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("❌ Error checking business status:", error);
      // Add user-friendly error handling
      setError("Unable to verify account status. Please try again.");

      // Fallback: try to redirect to dashboard anyway after a delay
      setTimeout(() => {
        console.log("🔄 Attempting fallback redirect to dashboard...");
        router.push("/dashboard");
      }, 2000);
    }
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

        // For existing users, sign them in with password
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          console.error("❌ Sign-in error:", result.error);
          setError("Invalid password. Please try again.");
          return;
        }

        if (result?.ok) {
          console.log("✅ Sign-in successful");

          // Successful sign-in - now check routing
          if (continueBusinessSetup) {
            console.log("🏗️ Continuing business setup flow...");
            router.push("/business-onboarding");
          } else {
            // Check business status and route accordingly
            await checkBusinessStatus();
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
    return userName ? `Welcome back ${userName}` : "Welcome back";
  };

  const getDescription = () => {
    if (isNewUser) {
      return `Please create a secure password for ${email}.`;
    }
    return `Please enter your password to sign in to ${email}.`;
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
          <TitleDescription title={getTitle()} description={getDescription()} />

          <div className={styles.formFields}>
            <TextInput
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                isNewUser ? "Create a secure password" : "Enter your password"
              }
              error={error}
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              }
            />

            {isNewUser && (
              <TextInput
                id="confirmPassword"
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            )}

            {isNewUser && (
              <div className={styles.passwordRequirements}>
                <p className={styles.requirementsTitle}>
                  Password must contain:
                </p>
                <ul className={styles.requirementsList}>
                  <li
                    className={
                      password.length >= 12 ? styles.valid : styles.invalid
                    }
                  >
                    At least 12 characters
                  </li>
                  <li
                    className={
                      /[A-Z]/.test(password) ? styles.valid : styles.invalid
                    }
                  >
                    One uppercase letter
                  </li>
                  <li
                    className={
                      /[a-z]/.test(password) ? styles.valid : styles.invalid
                    }
                  >
                    One lowercase letter
                  </li>
                  <li
                    className={
                      /\d/.test(password) ? styles.valid : styles.invalid
                    }
                  >
                    One number
                  </li>
                  <li
                    className={
                      /[!@#$%^&*(),.?":{}|<>]/.test(password)
                        ? styles.valid
                        : styles.invalid
                    }
                  >
                    One special character
                  </li>
                </ul>
              </div>
            )}

            <div className={styles.buttonContainer}>
              <Button
                variant="primary-green"
                onClick={handleSubmit}
                disabled={
                  isLoading || !password || (isNewUser && !confirmPassword)
                }
                fullWidth
              >
                {isLoading ? "Processing..." : "Continue"}
              </Button>

              {!isNewUser && (
                <div className={styles.forgotPassword}>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className={styles.forgotPasswordLink}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
