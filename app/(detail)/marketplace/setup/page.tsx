// app/(detail)/marketplace/setup/page.tsx
"use client";

import React, { useState, useRef, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LocationDetailsHeader from "@/components/layouts/headers/LocationDetailsHeader";
import styles from "./page.module.css";

// Import your existing page components
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

// Congratulations component
function CongratulationsStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className={styles.congratulationsContainer}>
      <div className={styles.congratulationsContent}>
        <div className={styles.successIcon}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path
              d="M20 32L12 24L14.83 21.17L20 26.34L33.17 13.17L36 16L20 32Z"
              fill="#22C55E"
            />
          </svg>
        </div>
        <h1 className={styles.congratulationsTitle}>Congratulations!</h1>
        <p className={styles.congratulationsDescription}>
          Your marketplace profile is now complete and ready to go live.
          Customers can now discover and book with your business.
        </p>
        <button onClick={onContinue} className={styles.congratulationsButton}>
          View My Profile
        </button>
        <div className={styles.featuresContainer}>
          <h3>What's next?</h3>
          <ul>
            <li>Your profile is now live on the marketplace</li>
            <li>Customers can find and book with you</li>
            <li>You can manage bookings from your dashboard</li>
            <li>Update your profile anytime from the marketplace section</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function MarketplaceSetupContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null); // This will hold the center ID for location APIs

  const stepRef = useRef<HTMLDivElement>(null);

  // Get user's business ID
  useEffect(() => {
    const getUserBusinessId = async () => {
      try {
        console.log("🔍 Fetching business status...");
        const response = await fetch("/api/user/business-status", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to get business information");
        }

        const data = await response.json();
        console.log("📊 Business status data:", JSON.stringify(data, null, 2));

        if (!data.business) {
          console.log("❌ No business found in response");
          setError("No business found. Please complete business setup first.");
          return;
        }

        console.log(
          "🏢 Business found:",
          data.business.name,
          "ID:",
          data.business.id
        );

        // Check if business already has a center
        if (data.business.centers && data.business.centers.length > 0) {
          console.log("✅ Using existing center:", data.business.centers[0].id);
          setBusinessId(data.business.centers[0].id); // Use center ID, not business ID
        } else {
          console.log("🔨 Creating new center from business...");
          // Auto-create a center from business data
          const centerId = await createCenterFromBusiness(data.business.id);
          console.log("🆕 Created center ID:", centerId);
          if (centerId) {
            setBusinessId(centerId); // Use the newly created center ID
          } else {
            setError("Failed to create location for business setup.");
          }
        }
      } catch (error) {
        console.error("❌ Error getting business ID:", error);
        setError("Failed to load business information");
      }
    };

    getUserBusinessId();
  }, []);

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
      handleClose();
    }
  };

  const handleClose = () => {
    router.push("/marketplace");
  };

  const handleHeaderContinue = () => {
    // This will trigger the save action in the current step component
    if (typeof window !== "undefined") {
      // @ts-ignore
      if (window.marketplaceStepContinue) {
        // @ts-ignore
        window.marketplaceStepContinue();
      }
    }
  };

  // Handle final redirect to marketplace after setup completion
  const handleFinalContinue = () => {
    router.push("/marketplace");
  };

  // Enhanced component wrapper that modifies behavior for onboarding
  const OnboardingStepWrapper = ({
    children,
    stepIndex,
  }: {
    children: React.ReactElement;
    stepIndex: number;
  }) => {
    useEffect(() => {
      // Override the navigation behavior for onboarding
      const originalPush = router.push;
      const originalBack = router.back;

      // Intercept navigation and redirect to next step instead
      router.push = (url: string) => {
        console.log("🔄 Intercepted navigation to:", url);
        // If component tries to navigate away after saving, continue to next step
        if (url.includes("/locations/") && !url.includes("/marketplace")) {
          console.log("✅ Continuing to next step");
          handleContinue();
          return Promise.resolve(true);
        }
        console.log("🔄 Allowing navigation to:", url);
        return originalPush(url);
      };

      router.back = () => {
        handleBack();
      };

      // Expose continue function for header
      // @ts-ignore
      window.marketplaceStepContinue = () => {
        // Trigger the save action of the current component
        const event = new CustomEvent("marketplaceSave");
        window.dispatchEvent(event);
      };

      return () => {
        router.push = originalPush;
        router.back = originalBack;
        // @ts-ignore
        delete window.marketplaceStepContinue;
      };
    }, [stepIndex]);

    // Clone the component and pass the center ID to use location APIs
    console.log("🎯 Cloning component with center ID:", centerId);
    return React.cloneElement(children, {
      params: Promise.resolve({ id: centerId }),
      // Add onboarding mode prop to modify component behavior
      onboardingMode: true,
    });
  };

  const renderStep = () => {
    if (!centerId) {
      return (
        <div className={styles.loading}>
          <div className={styles.loadingContent}>
            {isLoading ? (
              <>
                <div className={styles.loadingSpinner}></div>
                <p>Setting up your first location...</p>
              </>
            ) : (
              <p>Loading marketplace setup...</p>
            )}
          </div>
        </div>
      );
    }

    console.log("🎯 Rendering step", currentStep, "with center ID:", centerId);

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
            <CongratulationsStep onContinue={handleFinalContinue} />
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
          isLoading={isLoading}
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

export default function MarketplaceSetupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MarketplaceSetupContent />
    </Suspense>
  );
}
