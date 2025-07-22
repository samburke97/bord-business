"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import LocationDetailsStep from "@/components/locations/LocationDetailsStep";
import SetLocationStep from "@/components/locations/SetLocationStep";
import ConfirmAddressStep from "@/components/locations/ConfirmAddressStep";
import ConfirmMapLocationStep from "@/components/locations/ConfirmMapLocationStep";
import LocationDetailsHeader from "@/components/layouts/headers/LocationDetailsHeader";
import styles from "./page.module.css";

// Define a type for the form data to improve type safety
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

const STEPS = [
  "Location Details",
  "Set Location",
  "Confirm Address",
  "Confirm Map Location",
];

export default function CreateLocationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    // Step 1: Location Details
    name: "",
    categoryId: "",
    sports: [],

    // Step 2: Set Location
    address: "",

    // Step 3: Confirm Address Details
    streetAddress: "",
    aptSuite: "",
    city: "",
    postcode: "",
    state: "",

    // Step 4: Confirm Map Location
    latitude: null,
    longitude: null,
  });

  // Reference to the current step component
  const stepRef = useRef<HTMLDivElement>(null);

  const handleContinue = async (data: Partial<FormData>) => {
    // Update form data with values from the current step
    const updatedFormData = { ...formData, ...data };

    // Special handling for step 1 to step 2 transition
    if (currentStep === 1 && data.address) {
      // If we're moving from Set Location to Confirm Address
      // Make sure address components are passed along if they're not already set
      if (!data.streetAddress && formData.address !== data.address) {
        try {
          // Attempt to parse the address components
          const addressParts = data.address
            .split(",")
            .map((part: string) => part.trim());

          if (addressParts.length >= 2) {
            // Extract street address from the first part
            updatedFormData.streetAddress = addressParts[0];

            // Try to extract city from the second part
            updatedFormData.city = addressParts[1];

            // Try to extract state and postcode from the last part
            if (addressParts.length >= 3) {
              const lastPart = addressParts[addressParts.length - 1];
              const statePostcodeParts = lastPart.split(" ").filter(Boolean);

              // The first part should be the state
              if (statePostcodeParts.length >= 1) {
                updatedFormData.state = statePostcodeParts[0];
              }

              // The last part should be the postcode
              if (statePostcodeParts.length >= 2) {
                updatedFormData.postcode =
                  statePostcodeParts[statePostcodeParts.length - 1];
              }
            }
          }
        } catch (error) {}
      }
    }

    setFormData(updatedFormData);

    // If we're on the last step, submit the form
    if (currentStep === STEPS.length - 1) {
      // Log the final data being submitted
      const createdLocation = await handleSubmit(updatedFormData);

      // If we have a location ID, navigate to it
      if (createdLocation?.id) {
        router.push(`/locations/${createdLocation.id}`);
      }
    } else {
      // Otherwise, move to the next step
      setCurrentStep(currentStep + 1);
    }

    // Return the updated data for child components
    return updatedFormData;
  };

  // This function will be used by the header's continue button
  const handleHeaderContinue = useCallback(() => {
    // Add type declaration for window to extend its type
    interface ExtendedWindow extends Window {
      handleDetailsStepContinue?: () => void;
      handleLocationContinue?: () => void;
      handleAddressContinue?: () => void;
      handleMapContinue?: () => void;
    }

    if (typeof window === "undefined") return;

    const extendedWindow = window as ExtendedWindow;

    // Use the appropriate handler for each step
    const stepHandlers = [
      extendedWindow.handleDetailsStepContinue,
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
    }
  };

  // Handle closing the form and navigating back
  const handleClose = () => {
    router.push("/locations");
  };

  // Submit the final form data
  const handleSubmit = async (data: FormData) => {
    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      // Get the text response first for debugging
      const responseText = await response.text();

      // Try to parse the JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {}

      if (!response.ok) {
        const errorMessage = responseData?.error || "Failed to create location";
        const errorDetails = responseData?.details || "";
        throw new Error(
          `${errorMessage}${errorDetails ? ": " + errorDetails : ""}`
        );
      }

      // Return the created location data so it's available for routing
      return responseData;
    } catch (error) {
      return null;
    }
  };

  // Render the current step of the form
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div ref={stepRef}>
            <LocationDetailsStep
              formData={formData}
              onContinue={handleContinue}
            />
          </div>
        );
      case 1:
        return (
          <div ref={stepRef}>
            <SetLocationStep
              formData={formData}
              onContinue={handleContinue}
              onBack={handleBack}
            />
          </div>
        );
      case 2:
        return (
          <div ref={stepRef}>
            <ConfirmAddressStep
              formData={formData}
              onContinue={handleContinue}
              onBack={handleBack}
            />
          </div>
        );
      case 3:
        return (
          <div ref={stepRef}>
            <ConfirmMapLocationStep
              formData={formData}
              onContinue={handleContinue}
              onBack={handleBack}
              mode="create"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <LocationDetailsHeader
        steps={STEPS}
        currentStep={currentStep}
        onBack={handleBack}
        onContinue={handleHeaderContinue}
        className={styles.locationHeader}
        onClose={handleClose}
        mode="create"
      />

      <div className={styles.formContainer}>{renderStep()}</div>
    </div>
  );
}
