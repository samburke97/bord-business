// app/(detail)/marketplace/setup/page.tsx - COMPLETE FIXED VERSION
"use client";

import React, { useState, useRef, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LocationDetailsHeader from "@/components/layouts/headers/LocationDetailsHeader";
import Congratulations from "@/components/ui/Congratulations";
import styles from "./page.module.css";

// Import the FIXED consolidated components
import EditAboutPage from "./edit/[id]/about/page";
import GalleryEditPage from "./edit/[id]/gallery/page";
import OpeningTimesEditPage from "./edit/[id]/opening-times/page";
import FacilitiesEditPage from "./edit/[id]/facilities/page";
import ContactEditPage from "./edit/[id]/contact/page";

const steps = [
  "About",
  "Gallery",
  "Opening Times",
  "Facilities",
  "Contact & Socials",
];

function MarketplaceSetupContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);

  // ✅ ADD: Prevent multiple initialization attempts
  const [isInitializing, setIsInitializing] = useState(false);
  const initializationRef = useRef<boolean>(false);

  const stepRef = useRef<HTMLDivElement>(null);

  // Helper function to create center from business
  const createCenterFromBusiness = async (
    businessId: string
  ): Promise<string | null> => {
    try {
      console.log("🔨 Calling create-center API for business:", businessId);

      const response = await fetch("/api/businesses/create-center", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Create-center API error:", errorData);
        throw new Error(errorData.error || "Failed to create center");
      }

      const result = await response.json();
      console.log("✅ Create-center API response:", result);

      return result.centerId;
    } catch (error) {
      console.error("❌ Network error creating center:", error);
      return null;
    }
  };

  // ✅ STRONGER: Initialize the flow with better race condition protection
  useEffect(() => {
    const initializeSetup = async () => {
      // ✅ CRITICAL: Multiple levels of protection
      if (
        !session?.user?.id ||
        isInitializing ||
        initializationRef.current ||
        centerId
      ) {
        // Don't run if we already have a center ID
        console.log(
          "🚫 Skipping initialization - already in progress or complete"
        );
        return;
      }

      // Mark as initializing IMMEDIATELY
      setIsInitializing(true);
      initializationRef.current = true;

      try {
        console.log("🚀 Initializing marketplace setup...");
        setIsLoading(true);
        setError(null);

        // Get user's business status
        const response = await fetch("/api/user/business-status", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to get business information");
        }

        const data = await response.json();
        console.log("📊 Business status:", data);
        console.log("📊 Business centers:", data.business?.centers);
        console.log("📊 Centers length:", data.business?.centers?.length);

        if (!data.business) {
          setError("No business found. Please complete business setup first.");
          return;
        }

        // ✅ IMPROVED: Better center detection and creation logic
        let centerToUse = null;

        // Check if business already has a center
        if (data.business.centers && data.business.centers.length > 0) {
          // Use the most recent center
          centerToUse = data.business.centers[0].id;
          console.log("✅ Using existing center:", centerToUse);
        } else {
          console.log("🔨 No existing center found, creating new one...");
          console.log("🔨 Business ID for center creation:", data.business.id);

          // Create center (API handles race conditions internally)
          const newCenterId = await createCenterFromBusiness(data.business.id);

          if (newCenterId) {
            centerToUse = newCenterId;
            console.log("🆕 Created/Retrieved center:", centerToUse);
          } else {
            setError("Failed to create location for business setup.");
            return;
          }
        }

        // ✅ CRITICAL: Set center ID only if we don't already have one
        if (centerToUse && !centerId) {
          setCenterId(centerToUse);
          console.log(
            "✅ Setup initialization complete with center:",
            centerToUse
          );
        }
      } catch (error) {
        console.error("❌ Error initializing setup:", error);
        setError("Failed to initialize marketplace setup. Please try again.");
      } finally {
        setIsLoading(false);
        setIsInitializing(false);
        // DON'T reset initializationRef here - keep it true to prevent re-runs
      }
    };

    initializeSetup();

    // ✅ ADD: Cleanup on unmount
    return () => {
      initializationRef.current = false;
    };
  }, [session?.user?.id]); // ✅ REMOVED centerId dependency to prevent loops

  // ✅ ADD: Reset initialization flag if user changes
  useEffect(() => {
    initializationRef.current = false;
    setIsInitializing(false);
  }, [session?.user?.id]);

  const handleContinue = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final step - show congratulations
      setCurrentStep(steps.length);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      // If we're at step 0, close and go back to marketplace
      router.push("/marketplace");
    }
  };

  const handleClose = () => {
    router.push("/marketplace");
  };

  const handleHeaderContinue = () => {
    // Trigger save action in the current step component
    const event = new CustomEvent("marketplaceSave");
    window.dispatchEvent(event);
  };

  const handleViewProfile = () => {
    // Navigate to the location detail page to show the completed profile
    if (centerId) {
      router.push(`/locations/${centerId}`);
    } else {
      router.push("/marketplace");
    }
  };

  const handleRemindLater = () => {
    // For now, just go back to marketplace
    router.push("/marketplace");
  };

  // Component wrapper that makes existing components work in onboarding mode
  const OnboardingStepWrapper = ({
    children,
    stepIndex,
  }: {
    children: React.ReactElement;
    stepIndex: number;
  }) => {
    useEffect(() => {
      // Set up navigation intercept for onboarding mode
      const originalPush = router.push;

      // Intercept router.push calls from child components
      router.push = (url: string) => {
        console.log("🔄 Intercepted navigation to:", url);

        // If component tries to navigate to location page after saving, continue to next step
        if (
          url.includes(`/locations/${centerId}`) &&
          !url.includes("/marketplace")
        ) {
          console.log("✅ Continuing to next step instead of navigating");
          handleContinue();
          return Promise.resolve(true);
        }

        // Allow other navigation
        return originalPush(url);
      };

      // Expose continue function for header button
      const handleSaveEvent = () => {
        setIsSaving(true);
        // Child component will handle the actual save and trigger navigation
        setTimeout(() => setIsSaving(false), 1000); // Reset after expected save time
      };

      window.addEventListener("marketplaceSave", handleSaveEvent);

      return () => {
        router.push = originalPush;
        window.removeEventListener("marketplaceSave", handleSaveEvent);
      };
    }, [stepIndex]);

    // Clone the component and pass the center ID and onboarding mode
    return React.cloneElement(children, {
      params: Promise.resolve({ id: centerId }),
      onboardingMode: true,
    });
  };

  const renderStep = () => {
    // Loading state while initializing
    if (isLoading || !centerId) {
      return (
        <div className={styles.loading}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingSpinner}></div>
            <p>Setting up your marketplace profile...</p>
          </div>
        </div>
      );
    }

    // Render current step using the FIXED consolidated components
    switch (currentStep) {
      case 0:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <OnboardingStepWrapper stepIndex={0}>
              <EditAboutPage />
            </OnboardingStepWrapper>
          </div>
        );
      case 1:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <OnboardingStepWrapper stepIndex={1}>
              <GalleryEditPage />
            </OnboardingStepWrapper>
          </div>
        );
      case 2:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <OnboardingStepWrapper stepIndex={2}>
              <OpeningTimesEditPage />
            </OnboardingStepWrapper>
          </div>
        );
      case 3:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <OnboardingStepWrapper stepIndex={3}>
              <FacilitiesEditPage />
            </OnboardingStepWrapper>
          </div>
        );
      case 4:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <OnboardingStepWrapper stepIndex={4}>
              <ContactEditPage />
            </OnboardingStepWrapper>
          </div>
        );
      case steps.length:
        return (
          <div ref={stepRef}>
            <Congratulations
              title="Congratulations!"
              description="Your marketplace profile is now complete and ready to go live. Customers can now discover and book with your business."
              primaryButtonText="View My Profile"
              secondaryButtonText="Back to Marketplace"
              onContinue={handleViewProfile}
              onRemindLater={handleRemindLater}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Show error state
  if (error) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.errorContainer}>
            <h2>Setup Error</h2>
            <p>{error}</p>
            <button
              onClick={() => router.push("/marketplace")}
              className={styles.errorButton}
            >
              Back to Marketplace
            </button>
          </div>
        </main>
      </div>
    );
  }

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
          isLoading={isSaving}
        />
      )}

      <main className={styles.main}>
        {/* Step Content */}
        <div className={styles.content}>{renderStep()}</div>
      </main>
    </div>
  );
}

export default function MarketplaceSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <MarketplaceSetupContent />
    </Suspense>
  );
}
