// components/auth/PasswordScreen.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import AuthLayout from "@/components/layouts/AuthLayout";
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
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | null
  >(null);

  const handleBack = () => {
    router.back();
  };

  const validatePassword = () => {
    let isValid = true;

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (isNewUser) {
      // Use the secure password validation for new users
      if (password.length < 12) {
        setPasswordError("Password must be at least 12 characters long");
        isValid = false;
      } else if (!/[A-Z]/.test(password)) {
        setPasswordError("Password must contain at least one uppercase letter");
        isValid = false;
      } else if (!/[a-z]/.test(password)) {
        setPasswordError("Password must contain at least one lowercase letter");
        isValid = false;
      } else if (!/\d/.test(password)) {
        setPasswordError("Password must contain at least one number");
        isValid = false;
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        setPasswordError(
          "Password must contain at least one special character"
        );
        isValid = false;
      } else {
        setPasswordError(null);
      }
    } else {
      setPasswordError(null);
    }

    // Validate confirm password for new users
    if (isNewUser) {
      if (!confirmPassword) {
        setConfirmPasswordError("Please confirm your password");
        isValid = false;
      } else if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match");
        isValid = false;
      } else {
        setConfirmPasswordError(null);
      }
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);

    try {
      // Check if this is a business setup continuation
      const continueBusinessSetup =
        searchParams.get("continue_business_setup") === "true";

      if (isNewUser) {
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
          setPasswordError(data.message || "Failed to set password");
          return;
        }

        onPasswordComplete();
      } else {
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
          setPasswordError("Invalid password. Please try again.");
          return;
        }

        if (result?.ok) {
          if (continueBusinessSetup) {
            window.location.href = "/"; // Let home page determine the right place
          } else {
            window.location.href = "/"; // Let home page determine the right place
          }
        }
      }
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push(`/password/forgot?email=${encodeURIComponent(email)}`);
  };

  const getTitle = () => {
    if (isNewUser) {
      return "Set Your Password";
    }
    return userName ? `How have you been?` : "Welcome back!";
  };

  const getDescription = () => {
    if (isNewUser) {
      return "Create a secure password for your account.";
    }
    return `Please enter your password to sign in to ${email}.`;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (passwordError) {
      setPasswordError(null);
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword(e.target.value);
    // Clear error when user starts typing
    if (confirmPasswordError) {
      setConfirmPasswordError(null);
    }
  };

  const passwordIcon = showPassword ? (
    <Image
      src="/icons/utility-outline/shown.svg"
      alt="Hide password"
      width={20}
      height={20}
    />
  ) : (
    <Image
      src="/icons/utility-outline/hidden.svg"
      alt="Show password"
      width={20}
      height={20}
    />
  );

  return (
    <AuthLayout showBackButton={true} onBackClick={handleBack}>
      <div className={styles.formWrapper}>
        <TitleDescription title={getTitle()} description={getDescription()} />

        <div className={styles.passwordForm}>
          <TextInput
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={handlePasswordChange}
            placeholder="Enter your password"
            error={passwordError}
            autoComplete={isNewUser ? "new-password" : "current-password"}
            rightIcon={
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={togglePasswordVisibility}
              >
                {passwordIcon}
              </button>
            }
            required
          />

          {isNewUser && (
            <TextInput
              id="confirmPassword"
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="Confirm your password"
              error={confirmPasswordError}
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={togglePasswordVisibility}
                >
                  {passwordIcon}
                </button>
              }
              required
            />
          )}

          <Button
            variant="primary-green"
            onClick={handleSubmit}
            disabled={isLoading}
            fullWidth
          >
            {isLoading
              ? "Loading..."
              : isNewUser
                ? "Create Account"
                : "Sign In"}
          </Button>
        </div>

        {!isNewUser && (
          <div className={styles.forgotPassword}>
            <button
              onClick={handleForgotPassword}
              className={styles.forgotPasswordLink}
            >
              Forgot your password?
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
