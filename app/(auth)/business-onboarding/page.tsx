// app/(auth)/business-onboarding/page.tsx - ORIGINAL SECURE VERSION
"use client";

import { useState, useRef, useEffect } from "react";
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

const STEPS = [
  "Business Name",
  "Category & Sports",
  "Set Location",
  "Confirm Address",
  "Confirm Map Location",
];

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [accessMessage, setAccessMessage] = useState("Verifying access...");
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

  // CRITICAL: Verify user access on every page load/refresh
  useEffect(() => {
    const verifyAccess = async () => {
      if (status === "loading") {
        setAccessMessage("Authenticating...");
        return;
      }

      // Step 1: Check authentication
      if (!session) {
        console.log("❌ Business Onboarding: No session, redirecting to login");
        router.replace("/login");
        return;
      }

      try {
        setAccessMessage("Checking your account setup...");

        // Step 2: Verify profile is complete
        console.log("🔍 Business Onboarding: Verifying profile completion...");

        const profileResponse = await fetch("/api/user/profile-status", {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });

        if (!profileResponse.ok) {
          throw new Error(`Profile check failed: ${profileResponse.status}`);
        }

        const profileData = await profileResponse.json();

        console.log("👤 Business Onboarding: Profile verification:", {
          isComplete: profileData.isProfileComplete,
          user: session.user?.email,
        });

        // If profile is incomplete, redirect to setup
        if (!profileData.isProfileComplete) {
          console.log(
            "🚫 Business Onboarding: Profile incomplete - redirecting to setup"
          );
          router.replace("/auth/setup");
          return;
        }

        setAccessMessage("Checking business requirements...");

        // Step 3: Check if user actually NEEDS business setup
        console.log("🔍 Business Onboarding: Checking business status...");

        const businessResponse = await fetch("/api/user/business-status", {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });

        if (!businessResponse.ok) {
          throw new Error(`Business check failed: ${businessResponse.status}`);
        }

        const businessData = await businessResponse.json();

        console.log("🏢 Business Onboarding: Business verification:", {
          needsSetup: businessData.needsSetup,
          hasOwnedBusiness: businessData.hasOwnedBusiness,
          hasBusinessMembership: businessData.hasBusinessMembership,
          user: session.user?.email,
        });

        // CRITICAL: If user doesn't need setup, they shouldn't be here
        if (!businessData.needsSetup) {
          console.log(
            "🚫 Business Onboarding: User already has business setup - access denied"
          );
          console.log("📊 Business Onboarding: Redirecting to dashboard");
          router.replace("/dashboard");
          return;
        }

        // All checks passed - user needs and can access business onboarding
        console.log(
          "✅ Business Onboarding: Access granted - user needs business setup"
        );
        setAccessMessage("Setting up business onboarding...");
        setIsCheckingAccess(false);
      } catch (error) {
        console.error(
          "❌ Business Onboarding: Access verification failed:",
          error
        );

        // On error, redirect to setup to be safe
        console.log(
          "🔄 Business Onboarding: Error occurred, redirecting to setup"
        );
        router.replace("/auth/setup");
      }
    };

    verifyAccess();
  }, [session, status, router]);

  // Show loading while checking access
  if (status === "loading" || isCheckingAccess) {
    return (
      <div className={styles.container}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #e5e7eb",
              borderTop: "4px solid #10b981",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1f2937",
                margin: "0 0 8px 0",
              }}
            >
              Verifying Access
            </h2>
            <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>
              {accessMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleContinue = async (data: Partial<BusinessFormData>) => {
    const updatedFormData = { ...formData, ...data };
    setFormData(updatedFormData);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final step - create the business
      await createBusiness(updatedFormData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    // Navigate back to setup (safest option)
    router.push("/auth/setup");
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

      // Call the USER business creation API (not admin API)
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
          postalCode: data.postcode, // FIXED: API expects postalCode, form has postcode
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
      setCurrentStep(STEPS.length);
    } catch (error) {
      console.error("❌ Business Onboarding: Error creating business:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create business"
      );
      // Don't advance to congratulations step on error
    } finally {
      setIsCreating(false);
    }
  };

  const handleHeaderContinue = () => {
    // This will be called by the header when Continue is clicked
    // Each step component should expose its continue handler
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
    // Force navigation to dashboard
    console.log("✅ Business Onboarding: Complete - redirecting to dashboard");
    window.location.href = "/dashboard";
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
              mode="create"
            />
          </div>
        );
      case 5:
        return (
          <div ref={stepRef}>
            <BusinessCongratulationsStep
              businessName={formData.businessName}
              onContinue={handleFinalContinue} // Goes to dashboard
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {currentStep < STEPS.length && (
        <LocationDetailsHeader
          steps={STEPS}
          currentStep={currentStep}
          onBack={handleBack}
          onContinue={handleHeaderContinue}
          className={styles.header}
          onClose={handleClose} // Routes back to setup
          mode="create"
          disableContinue={isCreating} // Disable while creating
        />
      )}

      {error && (
        <div className={styles.errorBanner}>
          <p>Error: {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className={styles.formContainer}>
        {isCreating ? (
          <div className={styles.creatingState}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid #e5e7eb",
                  borderTop: "4px solid #10b981",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p>Creating your business...</p>
            </div>
          </div>
        ) : (
          renderStep()
        )}
      </div>
    </div>
  );
}
