// components/auth/BusinessSetupForm.tsx (MINIMAL FIXES ONLY)
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ActionHeader from "../layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";
import CountryCodeSelect from "@/components/ui/CountryCodeSelect";
import styles from "./BusinessSetupForm.module.css";

interface BusinessSetupFormProps {
  email: string;
  onSetupComplete: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: string;
  countryCode: string;
  mobile: string;
  password: string;
  confirmPassword: string; // Added confirm password
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
  dateOfBirth?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string; // Added confirm password
}

export default function BusinessSetupForm({
  email,
  onSetupComplete,
}: BusinessSetupFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    username: "",
    dateOfBirth: "",
    countryCode: "+61", // Changed to Australia
    mobile: "",
    password: "",
    confirmPassword: "", // Added confirm password
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Added
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCountryCodeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, countryCode: value }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (formData.username.length > 30) {
      newErrors.username = "Username must be less than 30 characters";
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, periods, underscores, and hyphens";
    } else if (/^[.-]|[.-]$/.test(formData.username)) {
      newErrors.username =
        "Username cannot start or end with a period or hyphen";
    } else if (/[.-]{2,}/.test(formData.username)) {
      newErrors.username =
        "Username cannot have consecutive periods or hyphens";
    }

    // Date of Birth validation
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (age < 18) {
        newErrors.dateOfBirth = "You must be 18 or older";
      }
    }

    // Mobile validation
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (formData.mobile.length < 8) {
      newErrors.mobile = "Please enter a valid mobile number";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one lowercase letter";
    } else if (!/\d/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) return;

    setIsCheckingUsername(true);

    // FIXED: Clear any existing username errors before checking
    if (errors.username) {
      setErrors((prev) => ({ ...prev, username: undefined }));
    }

    try {
      const response = await fetch("/api/auth/check-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!data.available) {
        setErrors((prev) => ({
          ...prev,
          username: data.message || "Username is already taken",
        }));
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setErrors((prev) => ({
        ...prev,
        username: "Error checking username availability",
      }));
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameBlur = () => {
    if (formData.username && !errors.username) {
      checkUsernameAvailability(formData.username);
    }
  };

  const handleSubmit = async () => {
    // FIXED: Always allow submit, validate inside
    const isValid = validateForm();

    if (!isValid) {
      // Errors are already set and highlighted, just return
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/create-business-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          dateOfBirth: formData.dateOfBirth,
          fullMobile: `${formData.countryCode} ${formData.mobile}`,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Account creation failed");
      }

      // Send verification email
      await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      // Redirect to email verification
      window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
    } catch (error) {
      console.error("Account creation error:", error);

      // FIXED: Parse API errors and map to correct fields
      if (error instanceof Error) {
        const errorMessage = error.message;

        // Map specific errors to their fields
        if (
          errorMessage.includes("Username") ||
          errorMessage.includes("username")
        ) {
          setErrors({ username: errorMessage });
        } else if (
          errorMessage.includes("Email") ||
          errorMessage.includes("email")
        ) {
          setErrors({ firstName: errorMessage }); // Show at top of form
        } else if (
          errorMessage.includes("Password") ||
          errorMessage.includes("password")
        ) {
          setErrors({ password: errorMessage });
        } else {
          // Generic error - show on password field as fallback
          setErrors({ password: errorMessage });
        }
      } else {
        setErrors({ password: "Something went wrong" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: Only check if basic fields are filled for button state
  const hasBasicFields = useMemo(() => {
    return (
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.username.trim() &&
      formData.dateOfBirth &&
      formData.mobile.trim() &&
      formData.password &&
      formData.confirmPassword
    );
  }, [formData]);

  // FIXED: Password requirements only when password exists but incomplete
  const passwordRequirements = useMemo(() => {
    if (!formData.password) return null;

    const requirements = {
      length: formData.password.length >= 8,
      uppercase: /[A-Z]/.test(formData.password),
      lowercase: /[a-z]/.test(formData.password),
      number: /\d/.test(formData.password),
    };

    const allMet = Object.values(requirements).every(Boolean);
    return allMet ? null : requirements; // Return null if all met (hide requirements)
  }, [formData.password]);

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
            title="Create Business Account"
            description={`Let's get you started! We'll create your business account for ${email}.`}
          />

          <div className={styles.formFields}>
            <TextInput
              id="firstName"
              label="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              placeholder="Enter your first name"
              error={errors.firstName}
              required
            />

            <TextInput
              id="lastName"
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              placeholder="Enter your last name"
              error={errors.lastName}
              required
            />

            <div className={styles.usernameField}>
              <TextInput
                id="username"
                label="Username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                onBlur={handleUsernameBlur}
                placeholder="Choose a unique username"
                error={errors.username}
                required
                disabled={isCheckingUsername}
              />
              {isCheckingUsername && (
                <div className={styles.checkingText}>
                  Checking availability...
                </div>
              )}
            </div>

            <TextInput
              id="dateOfBirth"
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
              error={errors.dateOfBirth}
              required
            />

            <div className={styles.mobileField}>
              <label className={styles.label}>Mobile</label>
              <div className={styles.mobileInputContainer}>
                <CountryCodeSelect
                  value={formData.countryCode}
                  onChange={handleCountryCodeChange}
                />
                <TextInput
                  id="mobile"
                  label=""
                  value={formData.mobile}
                  onChange={(e) => handleInputChange("mobile", e.target.value)}
                  placeholder="Enter your mobile number"
                  error={errors.mobile}
                  type="tel"
                  required
                />
              </div>
            </div>

            <div className={styles.passwordField}>
              <TextInput
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Create a secure password"
                error={errors.password}
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
            </div>

            <div className={styles.passwordField}>
              <TextInput
                id="confirmPassword"
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                placeholder="Confirm your password"
                error={errors.confirmPassword}
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={styles.passwordToggle}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                }
              />
            </div>

            {/* FIXED: Only show password requirements when password needs improvement */}
            {passwordRequirements && (
              <div className={styles.passwordRequirements}>
                <p>Password requirements:</p>
                <ul>
                  <li
                    className={
                      passwordRequirements.length ? styles.met : styles.unmet
                    }
                  >
                    At least 8 characters
                  </li>
                  <li
                    className={
                      passwordRequirements.uppercase ? styles.met : styles.unmet
                    }
                  >
                    One uppercase letter
                  </li>
                  <li
                    className={
                      passwordRequirements.lowercase ? styles.met : styles.unmet
                    }
                  >
                    One lowercase letter
                  </li>
                  <li
                    className={
                      passwordRequirements.number ? styles.met : styles.unmet
                    }
                  >
                    One number
                  </li>
                </ul>
              </div>
            )}

            <div className={styles.termsText}>
              <p>
                The time has come, please provide the details below to create
                your account for{" "}
                <span className={styles.emailHighlight}>{email}</span>.
              </p>
            </div>
          </div>

          {/* FIXED: Button stays active, only disabled when loading or missing basic fields */}
          <Button
            variant="primary-green"
            onClick={handleSubmit}
            disabled={isLoading || !hasBasicFields || isCheckingUsername}
            fullWidth
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
