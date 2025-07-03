// components/auth/BusinessSetupForm.tsx
"use client";

import { useState } from "react";
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
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
  dateOfBirth?: string;
  mobile?: string;
  password?: string;
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
    countryCode: "+44",
    mobile: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) return;

    setIsCheckingUsername(true);
    try {
      // TODO: Replace with actual API call
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
          username: "Username is already taken",
        }));
      }
    } catch (error) {
      console.error("Error checking username:", error);
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
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Replace with actual account creation API call
      const response = await fetch("/api/auth/create-business-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          ...formData,
          fullMobile: `${formData.countryCode} ${formData.mobile}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Account creation failed");
      }

      onSetupComplete();
    } catch (error) {
      console.error("Account creation error:", error);
      // Handle error - you might want to show a toast or set an error state
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = validateForm() && !isCheckingUsername;

  return (
    <div className={styles.container}>
      <ActionHeader
        type="back"
        secondaryAction={handleBack}
        primaryText="Continue"
        primaryAction={handleSubmit}
        primaryDisabled={!isFormValid || isLoading}
        className={styles.headerOverlay}
      />

      <div className={styles.content}>
        <div className={styles.formContainer}>
          <TitleDescription
            title="Create Business Account"
            description={`Let's get you started! Please provide the following details to create your account for ${email}.`}
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
                label="Public Username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                onBlur={handleUsernameBlur}
                placeholder="Choose a username"
                error={errors.username}
                showCharCount
                maxLength={25}
                required
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
                placeholder="Enter Password"
                error={errors.password}
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                }
              />
            </div>

            <div className={styles.termsText}>
              <p>
                The time has come, please provide the details below to create
                your account for{" "}
                <span className={styles.emailHighlight}>{email}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
