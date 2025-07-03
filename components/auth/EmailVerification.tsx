// components/auth/EmailVerification.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ActionHeader from "../layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import Button from "@/components/ui/Button";
import styles from "./EmailVerification.module.css";

interface EmailVerificationProps {
  email: string;
  onVerificationComplete: () => void;
}

export default function EmailVerification({
  email,
  onVerificationComplete,
}: EmailVerificationProps) {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleBack = () => {
    router.back();
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow single digits
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, 4);

    if (digits.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < digits.length && i < 4; i++) {
        newCode[i] = digits[i];
      }
      setCode(newCode);
      setError(null);

      // Focus the next empty input or the last input
      const nextIndex = Math.min(digits.length, 3);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join("");

    if (verificationCode.length !== 4) {
      setError("Please enter the complete 4-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      if (data.success) {
        onVerificationComplete();
      } else {
        throw new Error(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setError(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend email");
      }

      // Show success feedback
      console.log("Verification code resent successfully");
    } catch (error) {
      console.error("Resend error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to resend email. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (code.every((digit) => digit !== "") && !isLoading) {
      handleVerify();
    }
  }, [code]);

  const isCodeComplete = code.every((digit) => digit !== "");

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
            title="Verify Email"
            description={`To verify your email (${email}), please enter the code we sent to your email.`}
          />

          <div className={styles.codeInputContainer}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="\d"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={styles.codeInput}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.buttonContainer}>
            <Button
              variant="primary-green"
              onClick={handleVerify}
              disabled={!isCodeComplete || isLoading}
              fullWidth
            >
              {isLoading ? "Verifying..." : "Continue"}
            </Button>

            <Button
              variant="ghost"
              onClick={handleResendEmail}
              disabled={isResending}
              fullWidth
            >
              {isResending ? "Sending..." : "Resend Email"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
