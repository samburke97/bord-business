// app/(auth)/business-onboarding/page.tsx - UNIFIED with setup as step 0
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LocationDetailsHeader from "@/components/layouts/headers/LocationDetailsHeader";
import BusinessSetupForm from "@/components/auth/BusinessSetupForm";
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

// UPDATED STEPS - Setup is now step 0
const STEPS = [
  "Account Setup",
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
  const [email, setEmail] = useState("");

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

  useEffect(() => {
    const verifyAccess = async () => {
      if (status === "loading") {
        setAccessMessage("Authenticating...");
        return;
      }

      // Get email from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const urlEmail = urlParams.get("email") || "";
      setEmail(urlEmail);

      // CASE 1: OAuth user with session - check their profile status
      if (session?.user) {
        console.log("🔐 Business Onboarding: Authenticated user detected");
        setAccessMessage("Checking your profile...");

        try {
          const response = await fetch("/api/user/profile-status", {
            credentials: "include",
          });

          if (response.ok) {
            const profileData = await response.json();

            // If profile is complete, skip setup step and start from business name
            if (profileData.isProfileComplete) {
              console.log("✅ Profile complete, starting from business name");
              setCurrentStep(1); // Skip setup step
            } else {
              console.log("📝 Profile incomplete, starting from setup");
              setCurrentStep(0); // Start with setup
            }
          }
        } catch (error) {
          console.error("❌ Error checking user status:", error);
          setCurrentStep(0); // Default to setup step
        }

        setIsCheckingAccess(false);
        return;
      }

      // CASE 2: Email signup flow - no session yet, but has email
      if (!session && urlEmail) {
        console.log("📧 Business Onboarding: Email signup flow for:", urlEmail);
        setCurrentStep(0); // Start with setup
        setIsCheckingAccess(false);
        return;
      }

      // CASE 3: No session and no email - redirect to login
      if (!session && !urlEmail) {
        console.log("❌ No session or email, redirecting to login");
        router.push("/login");
        return;
      }
    };

    verifyAccess();
  }, [status, session, router]);

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
              Setting Up Your Business
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

  // Handle setup completion (step 0)
  const handleSetupComplete = () => {
    console.log("✅ Setup completed, moving to business name step");
    setCurrentStep(1); // Move to business name step
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    // Navigate back to login
    router.push("/login");
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
        setError("Please complete all required fields");
        return;
      }

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
      setCurrentStep(STEPS.length);
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

  const handleFinalContinue = () => {
    console.log("✅ Business Onboarding: Complete - redirecting to dashboard");
    window.location.href = "/dashboard";
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        // Setup step - no header continue needed, form handles its own submission
        return (
          <div ref={stepRef}>
            <BusinessSetupForm
              email={email}
              onSetupComplete={handleSetupComplete}
            />
          </div>
        );
      case 1:
        return (
          <div ref={stepRef}>
            <BusinessNameStep formData={formData} onContinue={handleContinue} />
          </div>
        );
      case 2:
        return (
          <div ref={stepRef}>
            <BusinessCategoryStep
              formData={formData}
              onContinue={handleContinue}
              onBack={handleBack}
            />
          </div>
        );
      case 3:
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
      case 4:
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
      case 5:
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
      case 6:
        return (
          <div ref={stepRef}>
            <BusinessCongratulationsStep
              businessName={formData.businessName}
              onContinue={handleFinalContinue}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Only show header after setup step (step 0) */}
      {currentStep > 0 && currentStep < STEPS.length && (
        <LocationDetailsHeader
          steps={STEPS.slice(1)} // Remove "Account Setup" from progress bar
          currentStep={currentStep - 1} // Adjust for 0-indexing after removing setup step
          onBack={handleBack}
          onContinue={handleHeaderContinue}
          className={styles.header}
          onClose={handleClose}
          mode="create"
          disableContinue={isCreating}
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
