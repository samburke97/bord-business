// app/(auth)/business-onboarding/page.tsx - FIXED VERSION WITH PROPER BACK NAVIGATION
"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LocationDetailsHeader from "@/components/layouts/headers/LocationDetailsHeader";
import BusinessNameStep from "@/components/business/BusinessNameStep";
import BusinessCategoryStep from "@/components/business/BusinessCategoryStep";
import SetLocationStep from "@/components/locations/SetLocationStep";
import ConfirmAddressStep from "@/components/locations/ConfirmAddressStep";
import ConfirmMapLocationStep from "@/components/locations/ConfirmMapLocationStep";
import BusinessCongratulationsStep from "@/components/business/BusinssCongratulationsStep";
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
    // Navigate back to dashboard - middleware will handle routing
    router.push("/dashboard");
  };

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

      // Call the USER business creation API
      const response = await fetch("/api/user/business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create business");
      }

      console.log("✅ Business Onboarding: Business created successfully!");

      // Show congratulations step
      setCurrentStep(steps.length);
    } catch (error) {
      console.error("❌ Business Onboarding: Error creating business:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create business"
      );
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
    // Use router.push instead of window.location.href for better UX
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
                name: formData.businessName,
                address: formData.address,
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
      case steps.length:
        return (
          <div ref={stepRef}>
            <BusinessCongratulationsStep
              businessName={formData.businessName}
              onContinue={handleFinalContinue}
            />
          </div>
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className={`${styles.container} min-h-screen bg-gray-50`}>
      <LocationDetailsHeader
        currentStep={currentStep}
        totalSteps={steps.length}
        steps={steps}
        onClose={currentStep === 0 ? handleClose : undefined} // Only show close on first step
        onBack={currentStep > 0 ? handleBack : undefined} // Only show back after first step
        onContinue={handleHeaderContinue}
        showContinue={currentStep < steps.length}
        isLoading={isCreating}
      />

      <main className={styles.main}>
        <div className={styles.content}>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {renderStep()}
        </div>
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
