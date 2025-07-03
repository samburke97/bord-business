// components/auth/PasswordScreen.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
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
      if (isNewUser) {
        // For new users, save the password and continue to setup
        const response = await fetch("/api/auth/set-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to set password");
        }

        onPasswordComplete();
      } else {
        // For existing users, sign them in with password
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid password. Please try again.");
          return;
        }

        if (result?.ok) {
          // Successful sign in, redirect to dashboard
          window.location.href = "/dashboard";
        }
      }
    } catch (error) {
      console.error("Password error:", error);
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password flow
    router.push(`/forgot-password?email=${encodeURIComponent(email)}`);
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

            <div className={styles.buttonContainer}>
              <Button
                variant="primary-green"
                onClick={handleSubmit}
                disabled={
                  isLoading || !password || (isNewUser && !confirmPassword)
                }
                fullWidth
              >
                {isLoading
                  ? "Loading..."
                  : isNewUser
                    ? "Set Password"
                    : "Continue"}
              </Button>

              {!isNewUser && (
                <Button
                  variant="ghost"
                  onClick={handleForgotPassword}
                  fullWidth
                >
                  Forgot Password?
                </Button>
              )}
            </div>

            {isNewUser && (
              <div className={styles.passwordRequirements}>
                <p className={styles.requirementsTitle}>
                  Password requirements:
                </p>
                <ul className={styles.requirementsList}>
                  <li
                    className={
                      password.length >= 8 ? styles.valid : styles.invalid
                    }
                  >
                    At least 8 characters
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
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Hero image */}
        <div className={styles.imageContainer}>
          <div className={styles.image} />
        </div>
      </div>
    </div>
  );
}
