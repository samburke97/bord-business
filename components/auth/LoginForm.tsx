// components/auth/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AuthLayout from "@/components/layouts/AuthLayout";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";
import styles from "./LoginForm.module.css";

interface LoginFormProps {
  accountType: "business" | "personal";
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
    router.back();
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

  const handleEmailSubmit = async () => {
    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    router.push(`/auth/password?email=${encodeURIComponent(email)}`);
  };

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error(`${provider} login failed:`, error);
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError(null);
  };

  return (
    <AuthLayout showBackButton={true} onBackClick={handleBack}>
      <div className={styles.formWrapper}>
        <TitleDescription title={title} description={description} />

        <div className={styles.authButtons}>
          <button
            onClick={() => handleSocialLogin("google")}
            disabled={isLoading}
            className={styles.socialButton}
          >
            <Image
              src="icons/login/google.svg"
              alt="Google"
              width={32}
              height={32}
            />
            <span className={styles.buttonText}>Continue with Google</span>
          </button>

          <button
            onClick={() => handleSocialLogin("facebook")}
            disabled={isLoading}
            className={styles.socialButton}
          >
            <Image
              src="icons/login/facebook.svg"
              alt="Facebook"
              width={32}
              height={32}
            />
            <span className={styles.buttonText}>Continue with Facebook</span>
          </button>
        </div>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <div className={styles.emailForm}>
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your email address"
            error={emailError}
            required
            autoFocus
          />

          <Button
            variant="primary-green"
            onClick={handleEmailSubmit}
            disabled={isLoading || !email}
            fullWidth
          >
            {isLoading ? "Loading..." : "Continue"}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
