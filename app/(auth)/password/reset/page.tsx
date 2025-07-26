"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Image from "next/image";
import AuthLayout from "@/components/layouts/AuthLayout";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | null
  >(null);

  useEffect(() => {
    const resetToken = searchParams.get("token");
    if (!resetToken) {
      router.push("/password/forgot");
    } else {
      setToken(resetToken);
    }
  }, [searchParams, router]);

  const validatePasswords = () => {
    let isValid = true;

    // Validate new password
    if (!newPassword) {
      setNewPasswordError("Password is required");
      isValid = false;
    } else if (newPassword.length < 8) {
      setNewPasswordError("Password must be at least 8 characters");
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setNewPasswordError(
        "Password must contain uppercase, lowercase, and number"
      );
      isValid = false;
    } else {
      setNewPasswordError(null);
    }

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      isValid = false;
    } else {
      setConfirmPasswordError(null);
    }

    return isValid;
  };

  const handleUpdatePassword = async () => {
    if (!validatePasswords()) {
      return;
    }

    setIsLoading(true);

    try {
      // Generate reCAPTCHA token
      const recaptchaToken = await executeRecaptcha("reset_password");

      if (!recaptchaToken) {
        setNewPasswordError("Security verification failed. Please try again.");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update password");
      }

      // Navigate to success page
      router.push("/password/reset/success");
    } catch (error) {
      setNewPasswordError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    setNewPasswordError(null);
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword(e.target.value);
    setConfirmPasswordError(null);
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
    <AuthLayout>
      <div className={styles.formWrapper}>
        <TitleDescription
          title="Reset Your Password"
          description="Enter your new password below"
        />

        <div className={styles.formFields}>
          <TextInput
            id="newPassword"
            label="New Password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={handleNewPasswordChange}
            placeholder="Enter your new password"
            error={newPasswordError}
            required
            rightIcon={
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={styles.passwordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {passwordIcon}
              </button>
            }
          />

          <TextInput
            id="confirmPassword"
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            placeholder="Confirm your new password"
            error={confirmPasswordError}
            required
            rightIcon={
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={styles.passwordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {passwordIcon}
              </button>
            }
          />
        </div>

        <Button
          variant="primary-green"
          onClick={handleUpdatePassword}
          disabled={isLoading || !newPassword || !confirmPassword}
          fullWidth
        >
          {isLoading ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingContainer}>
          <div>Loading...</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
