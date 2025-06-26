"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import SetLocationStep from "@/components/locations/SetLocationStep";
import ConfirmAddressStep from "@/components/locations/ConfirmAddressStep";
import ConfirmMapLocationStep from "@/components/locations/ConfirmMapLocationStep";
import LocationDetailsHeader from "@/components/layouts/headers/LocationDetailsHeader";
import Toast from "@/components/ui/Toast";
import styles from "./page.module.css";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Define a type for the form data
type FormData = {
  name: string;
  categoryId: string;
  sports: any[];
  address: string;
  streetAddress: string;
  aptSuite: string;
  city: string;
  postcode: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};

const STEPS = ["Set Location", "Confirm Address", "Confirm Map Location"];

export default function EditLocationAddressPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const [formData, setFormData] = useState<FormData>({
    // Location details (needed for map step)
    name: "",
    categoryId: "",
    sports: [],

    // Step 1: Set Location
    address: "",

    // Step 2: Confirm Address Details
    streetAddress: "",
    aptSuite: "",
    city: "",
    postcode: "",
    state: "",

    // Step 3: Confirm Map Location
    latitude: null,
    longitude: null,
  });

  // Reference to the current step component
  const stepRef = useRef<HTMLDivElement>(null);

  // Fetch existing location data
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/locations/${id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch location data");
        }

        const locationData = await response.json();

        const addressParts = (locationData.address || "").split(", ");

        // Set form data from location data
        setFormData({
          name: locationData.name || "",
          categoryId: locationData.establishmentId || "",
          sports: locationData.sports || [],
          address: locationData.address || "",
          streetAddress: addressParts[0] || "",
          aptSuite: "",
          city: addressParts[1] || "",
          state: addressParts[2]?.split(" ")[0] || "",
          postcode: addressParts[2]?.split(" ")[1] || "",
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });
      } catch (error) {
        console.error("Error fetching location data:", error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchLocationData();
    }
  }, [id]);

  // Handle continuing to the next step
  const handleContinue = async (
    data: Partial<FormData>
  ): Promise<Partial<FormData>> => {
    // Update form data with values from the current step
    const updatedFormData = { ...formData, ...data };
    setFormData(updatedFormData);

    // If we're on the last step, submit the form
    if (currentStep === STEPS.length - 1) {
      await handleSubmit(updatedFormData);
    } else {
      // Otherwise, move to the next step
      setCurrentStep(currentStep + 1);
    }

    return updatedFormData;
  };

  // This function will be used by the header's continue button
  const handleHeaderContinue = useCallback(() => {
    // Add type declaration for window to extend its type
    interface ExtendedWindow extends Window {
      handleLocationContinue?: () => void;
      handleAddressContinue?: () => void;
      handleMapContinue?: () => void;
    }

    if (typeof window === "undefined") return;

    const extendedWindow = window as ExtendedWindow;

    // Use the appropriate handler for each step
    const stepHandlers = [
      extendedWindow.handleLocationContinue,
      extendedWindow.handleAddressContinue,
      extendedWindow.handleMapContinue,
    ];

    const currentStepHandler = stepHandlers[currentStep];

    if (currentStepHandler) {
      currentStepHandler();
    } else if (stepRef.current) {
      // Fallback to finding a button
      const continueButton = stepRef.current.querySelector(
        '[class*="continueButton"]'
      );
      if (continueButton && continueButton instanceof HTMLButtonElement) {
        continueButton.click();
      }
    }
  }, [currentStep]);

  // Handle going back to the previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // If we're at the first step, go back to the location details page
      router.push(`/locations/${id}`);
    }
  };

  // Handle closing the form and returning to location details
  const handleClose = () => {
    router.push(`/locations/${id}`);
  };

  // Submit the address updates
  const handleSubmit = async (data: FormData) => {
    try {
      const payload = {
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
      };

      const response = await fetch(`/api/locations/${id}/address`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          responseData.error || "Failed to update location address"
        );
      }

      setToast({
        visible: true,
        message: "Location address updated successfully",
        type: "success",
      });

      // Navigate back to the location detail page after a short delay
      setTimeout(() => {
        router.push(`/locations/${id}`);
      }, 1500);
    } catch (error) {
      console.error("Error updating location address:", error);
      setToast({
        visible: true,
        message:
          (error as Error).message || "Failed to update location address",
        type: "error",
      });
    }
  };

  // Render the current step of the form
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div ref={stepRef}>
            <SetLocationStep
              formData={formData}
              onContinue={handleContinue}
              onBack={handleBack}
            />
          </div>
        );
      case 1:
        return (
          <div ref={stepRef}>
            <ConfirmAddressStep
              formData={formData}
              onContinue={handleContinue}
              onBack={handleBack}
            />
          </div>
        );
      case 2:
        return (
          <div ref={stepRef}>
            <ConfirmMapLocationStep
              formData={formData}
              onContinue={handleContinue}
              onBack={handleBack}
              mode="edit"
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>Error loading location address: {error}</p>
        <button
          onClick={() => router.push(`/locations/${id}`)}
          className={styles.backButton}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <LocationDetailsHeader
        steps={STEPS}
        currentStep={currentStep}
        onBack={handleBack}
        onContinue={handleHeaderContinue}
        onClose={handleClose}
        className={styles.locationHeader}
      />

      <div className={styles.formContainer}>{renderStep()}</div>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}
