// app/(detail)/marketplace/setup/page.tsx - COMPLETE FIXED VERSION
"use client";

import React, { useState, useRef, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LocationDetailsHeader from "@/components/layouts/headers/LocationDetailsHeader";
import Congratulations from "@/components/ui/Congratulations";
import styles from "./page.module.css";

// Import the FIXED consolidated components
import EditAboutPage from "./[id]/about/page";
import GalleryEditPage from "./[id]/gallery/page";
import OpeningTimesEditPage from "./[id]/opening-times/page";
import FacilitiesEditPage from "./[id]/facilities/page";
import ContactEditPage from "./[id]/contact/page";

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

  // Add step persistence using sessionStorage
  const [currentStep, setCurrentStep] = useState(() => {
    // Initialize currentStep from sessionStorage if available
    if (typeof window !== "undefined") {
      const savedStep = sessionStorage.getItem("marketplace-setup-step");
      return savedStep ? parseInt(savedStep, 10) : 0;
    }
    return 0;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);

  // Prevent multiple initialization attempts
  const [isInitializing, setIsInitializing] = useState(false);
  const initializationRef = useRef<boolean>(false);

  // Parent manages all form data
  const [formData, setFormData] = useState({
    // About step data
    about: {
      highlights: ["", "", ""],
      description: "",
      logo: null as string | null,
    },
    // Gallery step data
    gallery: {
      images: [] as Array<{ id: string; imageUrl: string; order: number }>,
    },
    // Opening times step data
    openingTimes: {
      openingHours: {} as any,
    },
    // Facilities step data
    facilities: {
      facilities: [] as Array<{ id: string; name: string }>,
    },
    // Contact step data
    contact: {
      phone: "",
      countryCode: "+44",
      email: "",
      website: "",
      socials: [] as Array<{ platform: string; url: string }>,
    },
  });

  const stepRef = useRef<HTMLDivElement>(null);

  // Save step to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("marketplace-setup-step", currentStep.toString());
    }
  }, [currentStep]);

  // Clear step persistence when setup is completed
  useEffect(() => {
    const clearStepPersistence = () => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("marketplace-setup-step");
      }
    };

    // Clear when reaching congratulations step
    if (currentStep >= steps.length) {
      clearStepPersistence();
    }

    // Clear on page unload
    window.addEventListener("beforeunload", clearStepPersistence);

    return () => {
      window.removeEventListener("beforeunload", clearStepPersistence);
    };
  }, [currentStep]);

  // Helper function to create center from business
  const createCenterFromBusiness = async (
    businessId: string
  ): Promise<string | null> => {
    try {
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
        throw new Error(errorData.error || "Failed to create center");
      }

      const result = await response.json();
      return result.centerId;
    } catch (error) {
      return null;
    }
  };

  // Initialize the flow with race condition protection
  useEffect(() => {
    const initializeSetup = async () => {
      // Multiple levels of protection
      if (
        !session?.user?.id ||
        isInitializing ||
        initializationRef.current ||
        centerId
      ) {
        return;
      }

      // Mark as initializing IMMEDIATELY
      setIsInitializing(true);
      initializationRef.current = true;

      try {
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

        if (!data.business) {
          setError("No business found. Please complete business setup first.");
          return;
        }

        // Better center detection and creation logic
        let centerToUse = null;

        // Check if business already has a center
        if (data.business.centers && data.business.centers.length > 0) {
          // Use the most recent center
          centerToUse = data.business.centers[0].id;
        } else {
          // Create center (API handles race conditions internally)
          const newCenterId = await createCenterFromBusiness(data.business.id);

          if (newCenterId) {
            centerToUse = newCenterId;
          } else {
            setError("Failed to create location for business setup.");
            return;
          }
        }

        // Set center ID only if we don't already have one
        if (centerToUse && !centerId) {
          setCenterId(centerToUse);
        }
      } catch (error) {
        setError("Failed to initialize marketplace setup. Please try again.");
      } finally {
        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    initializeSetup();

    // Cleanup on unmount
    return () => {
      initializationRef.current = false;
    };
  }, [session?.user?.id]);

  // Reset initialization flag if user changes
  useEffect(() => {
    initializationRef.current = false;
    setIsInitializing(false);
  }, [session?.user?.id]);

  // Handle continue with data persistence AND step validation
  const handleContinue = async (stepData: any) => {
    if (!centerId) return;

    try {
      setIsSaving(true);

      // Update parent form data
      const updatedFormData = { ...formData };

      // Save based on current step
      switch (currentStep) {
        case 0: // About step
          updatedFormData.about = { ...formData.about, ...stepData };
          setFormData(updatedFormData);

          // Save to database
          const aboutPayload = {
            highlights: updatedFormData.about.highlights.filter(
              (h: string) => h.trim() !== ""
            ),
            description: updatedFormData.about.description.trim(),
            logoUrl: updatedFormData.about.logo,
          };

          const aboutResponse = await fetch(
            `/api/marketplace/${centerId}/about`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(aboutPayload),
              credentials: "include",
            }
          );

          if (!aboutResponse.ok) {
            throw new Error("Failed to save about information");
          }

          break;

        case 1: // Gallery step
          updatedFormData.gallery = { ...formData.gallery, ...stepData };
          setFormData(updatedFormData);

          // Save to database using reorder endpoint (since images are already uploaded individually)
          if (
            updatedFormData.gallery.images &&
            updatedFormData.gallery.images.length > 0
          ) {
            const galleryPayload = {
              images: updatedFormData.gallery.images.map(
                (img: any, index: number) => ({
                  id: img.id,
                  imageUrl: img.imageUrl,
                  order: index + 1,
                })
              ),
            };

            const galleryResponse = await fetch(
              `/api/marketplace/${centerId}/images/reorder`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(galleryPayload),
                credentials: "include",
              }
            );

            if (!galleryResponse.ok) {
              throw new Error("Failed to save gallery");
            }
          }
          break;

        case 2: // Opening Times step
          updatedFormData.openingTimes = {
            ...formData.openingTimes,
            ...stepData,
          };
          setFormData(updatedFormData);

          // Save opening times
          const openingTimesResponse = await fetch(
            `/api/marketplace/${centerId}/opening-times`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatedFormData.openingTimes),
              credentials: "include",
            }
          );

          if (!openingTimesResponse.ok) {
            throw new Error("Failed to save opening times");
          }
          break;

        case 3: // Facilities step
          updatedFormData.facilities = { ...formData.facilities, ...stepData };
          setFormData(updatedFormData);

          // Save facilities (if any selected)
          if (updatedFormData.facilities.facilities.length > 0) {
            const facilitiesPayload = {
              facilities: updatedFormData.facilities.facilities.map(
                (f) => f.id
              ),
            };

            const facilitiesResponse = await fetch(
              `/api/marketplace/${centerId}/facilities`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(facilitiesPayload),
                credentials: "include",
              }
            );

            if (!facilitiesResponse.ok) {
              throw new Error("Failed to save facilities");
            }
          }
          break;

        case 4: // Contact step
          updatedFormData.contact = {
            ...formData.contact,
            ...stepData.contact,
          };
          setFormData(updatedFormData);

          // Format phone number
          let formattedPhone = null;
          if (updatedFormData.contact.phone.trim()) {
            const cleanedPhoneNumber = updatedFormData.contact.phone.trim();
            formattedPhone = cleanedPhoneNumber.startsWith("+")
              ? cleanedPhoneNumber
              : `${updatedFormData.contact.countryCode} ${cleanedPhoneNumber}`;
          }

          // Save contact information
          const contactPayload = {
            phone: formattedPhone,
            email: updatedFormData.contact.email || null,
            website: updatedFormData.contact.website || null,
            socials: updatedFormData.contact.socials
              .filter((social) => social.url?.trim())
              .map((social) => ({
                platform: social.platform,
                url: social.url.trim(),
              })),
          };

          const contactResponse = await fetch(
            `/api/marketplace/${centerId}/contact`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(contactPayload),
              credentials: "include",
            }
          );

          if (!contactResponse.ok) {
            throw new Error("Failed to save contact information");
          }
          break;
      }

      // Advance to next step
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        // Final step - show congratulations and clear persistence
        setCurrentStep(steps.length);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("marketplace-setup-step");
        }
      }
    } catch (error) {
      setError(
        `Failed to save ${steps[currentStep]} information. Please try again.`
      );
    } finally {
      setIsSaving(false);
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
    if (typeof window !== "undefined") {
      // @ts-ignore
      if (
        window.marketplaceSetup &&
        window.marketplaceSetup.handleStepContinue
      ) {
        // @ts-ignore
        window.marketplaceSetup.handleStepContinue();
      }
    }
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

    // Pass form data and onContinue to each step
    switch (currentStep) {
      case 0:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <EditAboutPage
              centerId={centerId}
              formData={formData.about}
              onContinue={handleContinue}
            />
          </div>
        );
      case 1:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <GalleryEditPage
              centerId={centerId}
              formData={formData.gallery}
              onContinue={handleContinue}
            />
          </div>
        );
      case 2:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <OpeningTimesEditPage
              centerId={centerId}
              formData={formData.openingTimes}
              onContinue={handleContinue}
            />
          </div>
        );
      case 3:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <FacilitiesEditPage
              centerId={centerId}
              formData={formData.facilities}
              onContinue={handleContinue}
            />
          </div>
        );
      case 4:
        return (
          <div ref={stepRef} className={styles.stepWrapper}>
            <ContactEditPage
              centerId={centerId}
              formData={formData.contact}
              onContinue={handleContinue}
            />
          </div>
        );
      case steps.length:
        return (
          <div ref={stepRef}>
            <Congratulations
              title="Congratulations"
              primaryButtonText="Continue"
              onContinue={() => router.push("/marketplace")}
              onRemindLater={() => router.push("/marketplace")}
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
