"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
  dateOfBirth?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
}

export default function BusinessSetupForm({
  email,
  onSetupComplete,
}: BusinessSetupFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    username: "",
    dateOfBirth: "",
    countryCode: "+61", // Australia default
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!session && !email) return;

      try {
        const response = await fetch("/api/user/profile-status", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          const isOAuth = !data.hasPassword;
          setIsOAuthUser(isOAuth);

          if (session?.user) {
            const nameParts = session.user.name?.split(" ") || [];
            setFormData((prev) => ({
              ...prev,
              firstName: data.firstName || nameParts[0] || "",
              lastName: data.lastName || nameParts.slice(1).join(" ") || "",
              mobile: data.phone ? data.phone.replace(/^\+\d+\s/, "") : "",
              dateOfBirth: data.dateOfBirth
                ? new Date(data.dateOfBirth).toISOString().split("T")[0]
                : "",
            }));
          }
        }
      } catch (error) {
        console.error("❌ Error checking user status:", error);
      }
    };

    checkUserStatus();
  }, [session, email]);

  const handleBack = () => {
    router.push("/login");
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCountryCodeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, countryCode: value }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (formData.username.length > 30) {
      newErrors.username = "Username must be less than 30 characters";
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, periods, underscores, and hyphens";
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        age < 13 ||
        (age === 13 && monthDiff < 0) ||
        (age === 13 && monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        newErrors.dateOfBirth = "You must be at least 13 years old";
      }
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{8,15}$/.test(formData.mobile.replace(/\s/g, ""))) {
      newErrors.mobile = "Please enter a valid mobile number";
    }

    if (!isOAuthUser) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password =
          "Password must contain at least one uppercase letter, one lowercase letter, and one number";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUsernameBlur = async () => {
    if (!formData.username.trim() || formData.username.length < 3) {
      return;
    }

    setIsCheckingUsername(true);
    try {
      const response = await fetch("/api/auth/check-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: formData.username }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors((prev) => ({ ...prev, username: data.message }));
      } else if (!data.available) {
        setErrors((prev) => ({
          ...prev,
          username: "Username is already taken",
        }));
      } else {
        setErrors((prev) => ({ ...prev, username: undefined }));
      }
    } catch (error) {
      console.error("Username check error:", error);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const endpoint = isOAuthUser
        ? "/api/user/complete-oauth-profile"
        : "/api/auth/create-business-account";

      const payload = isOAuthUser
        ? {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            username: formData.username.trim(),
            dateOfBirth: formData.dateOfBirth,
            fullMobile: `${formData.countryCode} ${formData.mobile.trim()}`,
          }
        : {
            email,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            username: formData.username.trim(),
            dateOfBirth: formData.dateOfBirth,
            fullMobile: `${formData.countryCode} ${formData.mobile.trim()}`,
            password: formData.password,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to complete setup");
      }

      if (isOAuthUser) {
        // OAuth users continue to business setup within the same flow
        onSetupComplete();
      } else {
        // Email/password users need email verification first
        await fetch("/api/auth/send-verification-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        // Redirect to email verification - they'll come back to business onboarding after verification
        window.location.href = `/verify-email?email=${encodeURIComponent(email)}&continue_business_setup=true`;
      }
    } catch (error) {
      console.error("❌ Business setup error:", error);

      if (error instanceof Error) {
        const errorMessage = error.message;

        if (
          errorMessage.includes("Username") ||
          errorMessage.includes("username")
        ) {
          setErrors({ username: errorMessage });
        } else if (
          errorMessage.includes("Email") ||
          errorMessage.includes("email")
        ) {
          setErrors({ firstName: errorMessage });
        } else if (
          errorMessage.includes("Password") ||
          errorMessage.includes("password")
        ) {
          setErrors({ password: errorMessage });
        } else if (
          errorMessage.includes("Mobile") ||
          errorMessage.includes("mobile")
        ) {
          setErrors({ mobile: errorMessage });
        } else if (
          errorMessage.includes("Date") ||
          errorMessage.includes("birth")
        ) {
          setErrors({ dateOfBirth: errorMessage });
        } else {
          setErrors({ password: errorMessage });
        }
      } else {
        setErrors({ password: "Something went wrong" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasBasicFields = useMemo(() => {
    const basicFields =
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.username.trim() &&
      formData.dateOfBirth &&
      formData.mobile.trim();

    if (isOAuthUser) {
      return basicFields;
    }

    return basicFields && formData.password && formData.confirmPassword;
  }, [formData, isOAuthUser]);

  const passwordRequirements = useMemo(() => {
    if (isOAuthUser || !formData.password) return null;

    const requirements = {
      length: formData.password.length >= 8,
      uppercase: /[A-Z]/.test(formData.password),
      lowercase: /[a-z]/.test(formData.password),
      number: /\d/.test(formData.password),
    };

    const allMet = Object.values(requirements).every(Boolean);
    return allMet ? null : requirements;
  }, [formData.password, isOAuthUser]);

  const getTitle = () => {
    if (isOAuthUser) {
      return "Complete Your Profile";
    }
    return "Create Business Account";
  };

  const getDescription = () => {
    if (isOAuthUser) {
      return "Just a few more details to complete your business account setup.";
    }
    return `Let's get you started! We'll create your business account for ${email}.`;
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
                placeholder="Johnlamb1076"
                error={errors.username}
                required
                disabled={isCheckingUsername}
                rightIcon={
                  <span className={styles.usernameCounter}>
                    {formData.username.length}/25
                  </span>
                }
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
              placeholder="DD/MM/YYYY"
              required
            />

            <div className={styles.mobileField}>
              <label className={styles.label}>Mobile</label>
              <div className={styles.connectedMobileInput}>
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

            {!isOAuthUser && (
              <div className={styles.passwordField}>
                <TextInput
                  id="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="Enter Password"
                  error={errors.password}
                  required
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.passwordToggle}
                    >
                      <Image
                        src={
                          showPassword
                            ? "/icons/utility-outline/shown.svg"
                            : "/icons/utility-outline/hidden.svg"
                        }
                        alt={showPassword ? "Hide password" : "Show password"}
                        width={20}
                        height={20}
                      />
                    </button>
                  }
                />

                {passwordRequirements && (
                  <div className={styles.passwordRequirements}>
                    <p>Password requirements:</p>
                    <ul>
                      <li
                        className={
                          passwordRequirements.length
                            ? styles.met
                            : styles.unmet
                        }
                      >
                        At least 8 characters
                      </li>
                      <li
                        className={
                          passwordRequirements.uppercase
                            ? styles.met
                            : styles.unmet
                        }
                      >
                        One uppercase letter
                      </li>
                      <li
                        className={
                          passwordRequirements.lowercase
                            ? styles.met
                            : styles.unmet
                        }
                      >
                        One lowercase letter
                      </li>
                      <li
                        className={
                          passwordRequirements.number
                            ? styles.met
                            : styles.unmet
                        }
                      >
                        One number
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="primary-green"
              onClick={handleSubmit}
              disabled={isLoading || !hasBasicFields || isCheckingUsername}
              fullWidth
            >
              {isLoading
                ? isOAuthUser
                  ? "Completing Setup..."
                  : "Creating Account..."
                : isOAuthUser
                  ? "Continue to Business Setup"
                  : "Create Account"}
            </Button>

            <div className={styles.termsText}>
              <p>
                The time has come, please provide the details below to create
                your account for{" "}
                {!isOAuthUser && (
                  <span className={styles.emailHighlight}>{email}</span>
                )}
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
