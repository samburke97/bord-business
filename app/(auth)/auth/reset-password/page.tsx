"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    router.push("/login");
  };

  const validatePassword = () => {
    if (!newPassword) {
      setError("Password is required");
      return false;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    setError(null);
    return true;
  };

  const handleUpdatePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    setIsLoading(true);
    setError(null);

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
        throw new Error(data.message || "Failed to update password");
      }

      // Navigate to success page
      router.push(
        `/auth/reset-password/success?email=${encodeURIComponent(email)}`
      );
    } catch (error) {
      console.error("Reset password error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange =
    (field: "new" | "confirm") => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (field === "new") {
        setNewPassword(e.target.value);
      } else {
        setConfirmPassword(e.target.value);
      }
      setError(null);
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
          <TitleDescription
            title="Change Password"
            description={`You can now change your password for [email address]`}
          />

          <div className={styles.formFields}>
            <TextInput
              id="newPassword"
              label="New Password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={handlePasswordChange("new")}
              placeholder="Enter your password"
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

            <TextInput
              id="confirmPassword"
              label="Repeat Password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={handlePasswordChange("confirm")}
              placeholder="Enter your password"
              required
            />

            <div className={styles.buttonContainer}>
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
