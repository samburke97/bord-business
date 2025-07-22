"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | null
  >(null);

  const handleBack = () => {
    router.push("/login");
  };

  const validateNewPassword = (password: string) => {
    if (!password) {
      setNewPasswordError("Password is required");
      return false;
    }

    if (password.length < 8) {
      setNewPasswordError("Password must be at least 8 characters");
      return false;
    }

    setNewPasswordError(null);
    return true;
  };

  const validateConfirmPassword = (
    password: string,
    confirmPassword: string
  ) => {
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      return false;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return false;
    }

    setConfirmPasswordError(null);
    return true;
  };

  const handleUpdatePassword = async () => {
    const isNewPasswordValid = validateNewPassword(newPassword);
    const isConfirmPasswordValid = validateConfirmPassword(
      newPassword,
      confirmPassword
    );

    if (!isNewPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    if (!token) {
      setNewPasswordError(
        "Invalid reset link. Please request a new password reset."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setNewPasswordError(data.message || "Failed to update password");
        return;
      }

      // Navigate to success page
      router.push(
        `/auth/reset-password/success?email=${encodeURIComponent(email)}`
      );
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

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    if (newPasswordError) {
      setNewPasswordError(null);
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword(e.target.value);
    if (confirmPasswordError) {
      setConfirmPasswordError(null);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
              <TitleDescription
                title="Change Password"
                description={`You can now change your password for ${email || "[email address]"}`}
              />

              <div className={styles.formFields}>
                <TextInput
                  id="newPassword"
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="Enter your password"
                  error={newPasswordError}
                  required
                  rightIcon={
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className={styles.passwordToggle}
                    >
                      {passwordIcon}
                    </button>
                  }
                />

                <TextInput
                  id="confirmPassword"
                  label="Repeat Password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="Enter your password"
                  error={confirmPasswordError}
                  required
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
