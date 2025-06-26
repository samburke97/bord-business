"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TextInput from "@/components/ui/TextInput";
import TitleDescription from "@/components/ui/TitleDescription";
import Button from "@/components/ui/Button";

// Separate client component that uses useSearchParams
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const returnTo = searchParams.get("return_to") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push(returnTo);
    }
  }, [status, session, router, returnTo]);

  // Show form error if coming from URL param
  useEffect(() => {
    if (urlError === "CredentialsSignin") {
      setFormError(
        "The email or password you entered doesn't match our records."
      );
      triggerShake();
    }
  }, [urlError]);

  // Validate email when it changes after form submission
  useEffect(() => {
    // Only validate if form was submitted and there's no auth error message
    if (formSubmitted && !formError?.includes("doesn't match our records")) {
      validateEmail(email);
    } else if (formError?.includes("doesn't match our records")) {
      // Explicitly clear email error when showing auth error
      setEmailError(null);
    }
  }, [email, formSubmitted, formError]);

  // Validate password when it changes after form submission
  useEffect(() => {
    // Only validate if form was submitted and there's no auth error message
    if (formSubmitted && !formError?.includes("doesn't match our records")) {
      validatePassword(password);
    } else if (formError?.includes("doesn't match our records")) {
      // Explicitly clear password error when showing auth error
      setPasswordError(null);
    }
  }, [password, formSubmitted, formError]);

  // Clear form error when inputs change
  useEffect(() => {
    if (formError && !formError.includes("doesn't match our records")) {
      setFormError(null);
    }
  }, [email, password, formError]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 820);
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

  const validatePassword = (value: string) => {
    if (!value || value.trim() === "") {
      setPasswordError("Password is required");
      return false;
    }

    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors first
    setFormError(null);

    // Validate fields
    setFormSubmitted(true);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      // Focus on the first field with an error
      if (!isEmailValid && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (!isPasswordValid && passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
      setFormError(null);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      // Clear field-level errors
      setEmailError(null);
      setPasswordError(null);

      if (result?.error) {
        // Clear field-level errors to prioritize the auth error message
        setEmailError(null);
        setPasswordError(null);

        // Set top-level form error ONLY if there's an error
        setFormError(
          "The email or password you entered doesn't match our records."
        );
        triggerShake();

        // Clear password for security
        setPassword("");
      } else if (result?.ok) {
        // Successful login
        router.push(returnTo);
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setFormError("An unexpected error occurred. Please try again.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const EyeOpenIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 5C7.45455 5 3.57273 7.90909 2 12C3.57273 16.0909 7.45455 19 12 19C16.5455 19 20.4273 16.0909 22 12C20.4273 7.90909 16.5455 5 12 5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const EyeClosedIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className={styles.formWrapper}>
      <TitleDescription
        title="Welcome to Bord Admin"
        description="Sign in to access your dashboard"
      />

      {formError && (
        <div className={`${styles.formErrorContainer} ${styles.visible}`}>
          {formError}
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`${styles.form} ${isShaking ? styles.shake : ""}`}
      >
        <div className={styles.inputGroup}>
          <TextInput
            ref={emailInputRef}
            label="Email address"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            error={emailError}
            name="email"
          />
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.passwordContainer}>
            <TextInput
              ref={passwordInputRef}
              label="Password"
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              error={passwordError}
              name="password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.passwordToggle}
            >
              {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </button>
          </div>
        </div>

        <Button variant="primary-green" type="submit" disabled={isLoading}>
          {isLoading ? "Loading..." : "Continue"}
        </Button>

        <div className={styles.forgotPassword}>
          <p className={styles.contactAdmin}>
            Forgot your password? Please contact your administrator.
          </p>
        </div>
      </form>
    </div>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Left side: Form */}
      <div className={styles.formContainer}>
        <Suspense
          fallback={
            <div className={styles.loadingContainer}>
              <LoadingSpinner />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>

      {/* Right side: Image */}
      <div className={styles.imageContainer}></div>
    </div>
  );
}
