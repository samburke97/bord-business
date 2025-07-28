"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LocationDetailsHeader from "@/components/layouts/headers/LocationDetailsHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import styles from "./page.module.css";

// Import step components (we'll adapt these from existing edit pages)
import MarketplaceAboutStep from "@/components/marketplace/MarketplaceAboutStep";
import MarketplaceGalleryStep from "@/components/marketplace/MarketplaceGalleryStep";
import MarketplaceOpeningTimesStep from "@/components/marketplace/MarketplaceOpeningTimesStep";
import MarketplaceFacilitiesStep from "@/components/marketplace/MarketplaceFacilitiesStep";
import MarketplaceContactStep from "@/components/marketplace/MarketplaceContactStep";
import MarketplaceCongratulationsStep from "@/components/marketplace/MarketplaceCongratulationsStep";

// Define the marketplace form data structure
type MarketplaceFormData = {
  // About step
  description: string;
  highlights: string[];
  logo: string | null;

  // Gallery step
  images: any[];

  // Opening times step
  openingHours: any;

  // Facilities step
  facilities: string[];

  // Contact step
  phone: string;
  email: string;
  website: string;
  socials: {
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
    twitter: string;
  };
};

const steps = [
  "About Your Business",
  "Gallery",
  "Opening Times",
  "Facilities",
  "Contact & Socials",
];

export default function MarketplaceSetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [formData, setFormData] = useState<MarketplaceFormData>({
    // About step
    description: "",
    highlights: [],
    logo: null,

    // Gallery step
    images: [],

    // Opening times step
    openingHours: {},

    // Facilities step
    facilities: [],

    // Contact step
    phone: "",
    email: "",
    website: "",
    socials: {
      facebook: "",
      instagram: "",
      tiktok: "",
      youtube: "",
      twitter: "",
    },
  });

  const stepRef = useRef<HTMLDivElement>(null);

  // Initialize component - fetch existing data if any
  useEffect(() => {
    const initializeData = async () => {
      if (status === "loading") return;

      if (!session?.user) {
        router.push("/login");
        return;
      }

      try {
        // Get user's business data
        const response = await fetch("/api/user/marketplace-data", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch business data");
        }

        const data = await response.json();

        if (!data.businessId) {
          // User needs to complete business onboarding first
          router.push("/business/onboarding");
          return;
        }

        setBusinessId(data.businessId);

        // Pre-populate form with existing data
        setFormData({
          description: data.description || "",
          highlights: data.highlights || [],
          logo: data.logo || null,
          images: data.images || [],
          openingHours: data.openingHours || {},
          facilities: data.facilities || [],
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          socials: {
            facebook: data.socials?.facebook || "",
            instagram: data.socials?.instagram || "",
            tiktok: data.socials?.tiktok || "",
            youtube: data.socials?.youtube || "",
            twitter: data.socials?.twitter || "",
          },
        });

        // Determine which step to start on based on completed sections
        const completedSections = data.completedSections || {};
        let startStep = 0;

        if (completedSections.about) startStep = 1;
        if (completedSections.gallery) startStep = 2;
        if (completedSections.openingTimes) startStep = 3;
        if (completedSections.facilities) startStep = 4;
        if (completedSections.contact) startStep = 5;

        setCurrentStep(startStep);
      } catch (err) {
        console.error("Error initializing marketplace setup:", err);
        setError("Failed to load business data");
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [session, status, router]);

  const handleContinue = async (data: Partial<MarketplaceFormData>) => {
    // Update form data with values from the current step
    const updatedFormData = { ...formData, ...data };
    setFormData(updatedFormData);

    // Save progress for current step
    await saveStepProgress(currentStep, data);

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final step - mark as complete and show congratulations
      await markMarketplaceComplete();
      setCurrentStep(steps.length); // Show congratulations
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    router.push("/marketplace");
  };

  const saveStepProgress = async (stepIndex: number, stepData: any) => {
    if (!businessId) return;

    try {
      setIsSaving(true);

      const stepNames = [
        "about",
        "gallery",
        "openingTimes",
        "facilities",
        "contact",
      ];
      const stepName = stepNames[stepIndex];

      const response = await fetch(
        `/api/business/${businessId}/marketplace-step`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            step: stepName,
            data: stepData,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save progress");
      }
    } catch (err) {
      console.error("Error saving step progress:", err);
      // Don't block progression on save errors
    } finally {
      setIsSaving(false);
    }
  };

  const markMarketplaceComplete = async () => {
    if (!businessId) return;

    try {
      const response = await fetch(
        `/api/business/${businessId}/marketplace-complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to complete marketplace setup");
      }
    } catch (err) {
      console.error("Error completing marketplace setup:", err);
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
    router.push("/marketplace");
  };

  if (status === "loading" || isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>Something went wrong</h1>
          <p>{error}</p>
          <button onClick={() => router.push("/marketplace")}>
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div ref={stepRef}>
            <MarketplaceAboutStep
              formData={{
                description: formData.description,
                highlights: formData.highlights,
                logo: formData.logo,
              }}
              onContinue={handleContinue}
              businessId={businessId}
            />
          </div>
        );
      case 1:
        return (
          <div ref={stepRef}>
            <MarketplaceGalleryStep
              formData={{
                images: formData.images,
              }}
              onContinue={handleContinue}
              onBack={handleBack}
              businessId={businessId}
            />
          </div>
        );
      case 2:
        return (
          <div ref={stepRef}>
            <MarketplaceOpeningTimesStep
              formData={{
                openingHours: formData.openingHours,
              }}
              onContinue={handleContinue}
              onBack={handleBack}
              businessId={businessId}
            />
          </div>
        );
      case 3:
        return (
          <div ref={stepRef}>
            <MarketplaceFacilitiesStep
              formData={{
                facilities: formData.facilities,
              }}
              onContinue={handleContinue}
              onBack={handleBack}
              businessId={businessId}
            />
          </div>
        );
      case 4:
        return (
          <div ref={stepRef}>
            <MarketplaceContactStep
              formData={{
                phone: formData.phone,
                email: formData.email,
                website: formData.website,
                socials: formData.socials,
              }}
              onContinue={handleContinue}
              onBack={handleBack}
              businessId={businessId}
            />
          </div>
        );
      case steps.length:
        return (
          <div ref={stepRef}>
            <MarketplaceCongratulationsStep onContinue={handleFinalContinue} />
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
          isLoading={isSaving}
        />
      )}

      <div className={styles.formContainer}>{renderStep()}</div>
    </div>
  );
}
