"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LocationDetailsHeader from "@/components/layouts/headers/LocationDetailsHeader";
import BusinessNameStep from "@/components/locations/BusinessNameStep";
import BusinessCategoryStep from "@/components/locations/BusinessCategoryStep";
import SetLocationStep from "@/components/locations/SetLocationStep";
import ConfirmAddressStep from "@/components/locations/ConfirmAddressStep";
import ConfirmMapLocationStep from "@/components/locations/ConfirmMapLocationStep";
import BusinessCongratulationsStep from "@/components/locations/BusinessCongratulationsStep";
import styles from "./page.module.css";

// Define the business form data structure
type BusinessFormData = {
  businessName: string;
  businessCategory: string;
  associatedSports: any[];
  address: string;
  streetAddress: string;
  aptSuite: string;
  city: string;
  postcode: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};

const steps = [
  "Business Name",
  "Category & Sports",
  "Set Location",
  "Confirm Address",
  "Confirm Map Location",
];

function BusinessOnboardingContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<BusinessFormData>({
    businessName: "",
    businessCategory: "",
    associatedSports: [],
    address: "",
    streetAddress: "",
    aptSuite: "",
    city: "",
    postcode: "",
    state: "",
    latitude: null,
    longitude: null,
  });

  const stepRef = useRef<HTMLDivElement>(null);

  const handleContinue = async (data: Partial<BusinessFormData>) => {
    // Always save data as we progress
    const updatedFormData = { ...formData, ...data };
    setFormData(updatedFormData);

    // Log the data being saved for debugging
    console.log(
      `📝 Business Onboarding: Saving step ${currentStep} data:`,
      data
    );
    console.log(`💾 Business Onboarding: Updated form data:`, updatedFormData);

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final step - create the business
      await createBusiness(updatedFormData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      console.log(
        `⬅️ Business Onboarding: Going back from step ${currentStep} to ${currentStep - 1}`
      );
      console.log(`💾 Business Onboarding: Current saved data:`, formData);
      setCurrentStep((prev) => prev - 1);
    } else {
      // If we're at step 0, close and go to dashboard
      handleClose();
    }
  };

  const handleClose = () => {
    console.log("❌ Business Onboarding: Closing and returning to dashboard");
    router.push("/dashboard");
  };

  // Fixed createBusiness function with proper CSRF token extraction
  const createBusiness = async (data: BusinessFormData) => {
    try {
      setIsCreating(true);
      setError(null);

      console.log("🏢 Business Onboarding: Creating business with data:", data);

      // Validate required fields before sending
      if (
        !data.businessName ||
        !data.businessCategory ||
        !data.streetAddress ||
        !data.city ||
        !data.state ||
        !data.postcode
      ) {
        console.error("❌ Business Onboarding: Missing required fields:", {
          businessName: !!data.businessName,
          businessCategory: !!data.businessCategory,
          streetAddress: !!data.streetAddress,
          city: !!data.city,
          state: !!data.state,
          postcode: !!data.postcode,
        });
        setError("Please complete all required fields");
        return;
      }

      // Get CSRF token from NextAuth API
      console.log("🔒 Getting CSRF token from NextAuth...");
      const csrfResponse = await fetch("/api/auth/csrf", {
        credentials: "same-origin",
      });

      if (!csrfResponse.ok) {
        console.error("❌ Failed to get CSRF token:", csrfResponse.status);
        setError(
          "Security setup failed. Please refresh the page and try again."
        );
        return;
      }

      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      console.log("🔑 CSRF Response:", {
        status: csrfResponse.status,
        hasToken: !!csrfToken,
        tokenLength: csrfToken?.length || 0,
        tokenPreview: csrfToken?.substring(0, 20) + "...",
      });

      if (!csrfToken) {
        console.error("❌ No CSRF token in response:", csrfData);
        setError(
          "Security token missing. Please refresh the page and try again."
        );
        return;
      }

      // Debug: Log all cookies
      console.log("🍪 All cookies:", document.cookie);

      // Debug: Check specific NextAuth cookies
      const cookies = document.cookie.split(";").map((c) => c.trim());
      const nextAuthCookies = cookies.filter((c) => c.includes("next-auth"));
      console.log("🔐 NextAuth cookies:", nextAuthCookies);

      // Call the USER business creation API with enhanced headers
      console.log("📡 Making API call with CSRF token...");
      const response = await fetch("/api/user/business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
          // Add additional debugging headers
          "X-Debug-Request": "business-creation",
        },
        credentials: "same-origin", // This is crucial for including cookies
        body: JSON.stringify({
          businessName: data.businessName,
          businessType: data.businessCategory,
          address: `${data.streetAddress}${data.aptSuite ? `, ${data.aptSuite}` : ""}, ${data.city}, ${data.state} ${data.postcode}`,
          streetAddress: data.streetAddress,
          aptSuite: data.aptSuite,
          city: data.city,
          state: data.state,
          postalCode: data.postcode,
          latitude: data.latitude,
          longitude: data.longitude,
          sports: data.associatedSports,
        }),
      });

      console.log("📡 API Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const responseData = await response.json();
      console.log("📦 Response data:", responseData);

      if (!response.ok) {
        // Handle specific error cases with user-friendly messages
        if (response.status === 401) {
          setError("Session expired. Please log in again.");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        if (response.status === 403) {
          // Check if it's a CSRF error specifically
          if (
            responseData.error?.includes("CSRF") ||
            responseData.message?.includes("CSRF")
          ) {
            console.error("❌ CSRF Error Details:", {
              sentToken: csrfToken?.substring(0, 20) + "...",
              error: responseData.error,
              message: responseData.message,
            });
            setError(
              "Security validation failed. Please refresh the page and try again."
            );
          } else {
            setError(
              "You don't have permission to create a business. Please contact support."
            );
          }
          return;
        }

        if (response.status >= 500) {
          setError("Server error. Please try again in a few moments.");
          return;
        }

        // For other errors, show a generic message instead of the raw API error
        console.error("❌ API Error:", responseData);
        setError(
          "Unable to create business. Please try again or contact support if the problem persists."
        );
        return;
      }

      console.log("✅ Business Onboarding: Business created successfully!");

      // Show congratulations step
      setCurrentStep(steps.length);
    } catch (error) {
      console.error("❌ Business Onboarding: Error creating business:", error);

      // Show user-friendly error message instead of technical details
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(
          "Something went wrong. Please try again or contact support if the problem persists."
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleHeaderContinue = () => {
    // This will be called by the header when Continue is clicked
    if (typeof window !== "undefined") {
      // @ts-ignore
      if (window.handleStepContinue) {
        // @ts-ignore
        window.handleStepContinue();
      }
    }
  };

  // Handle final redirect to dashboard after business creation
  const handleFinalContinue = () => {
    console.log("✅ Business Onboarding: Complete - redirecting to dashboard");
    router.push("/dashboard");
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div ref={stepRef}>
            <BusinessNameStep formData={formData} onContinue={handleContinue} />
          </div>
        );
      case 1:
        return (
          <div ref={stepRef}>
            <BusinessCategoryStep
              formData={formData}
              onContinue={handleContinue}
              onBack={handleBack}
            />
          </div>
        );
      case 2:
        return (
          <div ref={stepRef}>
            <SetLocationStep
              formData={{
                address: formData.address,
                streetAddress: formData.streetAddress,
                city: formData.city,
                state: formData.state,
                postcode: formData.postcode,
                latitude: formData.latitude,
                longitude: formData.longitude,
              }}
              onContinue={handleContinue}
              onBack={handleBack}
            />
          </div>
        );
      case 3:
        return (
          <div ref={stepRef}>
            <ConfirmAddressStep
              formData={{
                streetAddress: formData.streetAddress,
                aptSuite: formData.aptSuite,
                city: formData.city,
                state: formData.state,
                postcode: formData.postcode,
                latitude: formData.latitude,
                longitude: formData.longitude,
              }}
              onContinue={handleContinue}
              onBack={handleBack}
            />
          </div>
        );
      case 4:
        return (
          <div ref={stepRef}>
            <ConfirmMapLocationStep
              formData={{
                latitude: formData.latitude,
                longitude: formData.longitude,
              }}
              onContinue={handleContinue}
              onBack={handleBack}
            />
          </div>
        );
      case steps.length:
        return (
          <div ref={stepRef}>
            <BusinessCongratulationsStep onContinue={handleFinalContinue} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header - shows for all steps except congratulations */}
      {currentStep < steps.length && (
        <LocationDetailsHeader
          currentStep={currentStep}
          totalSteps={steps.length}
          steps={steps}
          onClose={currentStep === 0 ? handleClose : undefined}
          onBack={currentStep > 0 ? handleBack : undefined}
          onContinue={handleHeaderContinue}
          showContinue={true}
          isLoading={isCreating}
        />
      )}

      <main className={styles.main}>
        {/* Error Display */}
        {error && (
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className={styles.content}>{renderStep()}</div>
      </main>
    </div>
  );
}

export default function BusinessOnboardingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BusinessOnboardingContent />
    </Suspense>
  );
}
