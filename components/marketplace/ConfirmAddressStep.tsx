"use client";

import { useState, useEffect } from "react";
import TextInput from "@/components/ui/TextInput";
import TitleDescription from "@/components/ui/TitleDescription";
import styles from "./ConfirmAddressStep.module.css";

interface ConfirmAddressStepProps {
  formData: {
    streetAddress?: string;
    aptSuite?: string;
    city?: string;
    state?: string;
    postcode?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  onContinue: (data: any) => void;
  onBack: () => void;
}

export default function ConfirmAddressStep({
  formData,
  onContinue,
  onBack,
}: ConfirmAddressStepProps) {
  // State for form fields
  const [streetAddress, setStreetAddress] = useState(
    formData.streetAddress || ""
  );
  const [aptSuite, setAptSuite] = useState(formData.aptSuite || "");
  const [city, setCity] = useState(formData.city || "");
  const [postcode, setPostcode] = useState(formData.postcode || "");
  const [state, setState] = useState(formData.state || "");

  // Handle form submission
  const handleContinue = () => {
    // Continue to the next step with whatever data we have
    onContinue({
      streetAddress,
      aptSuite,
      city,
      postcode,
      state,
    });
  };

  // Expose the continue handler for the header button
  useEffect(() => {
    // @ts-ignore
    window.handleStepContinue = handleContinue;

    return () => {
      // @ts-ignore
      delete window.handleStepContinue;
    };
  }, [streetAddress, aptSuite, city, postcode, state]);

  return (
    <div className={styles.stepPageContainer}>
      <div className={styles.stepContainer}>
        <TitleDescription
          title="Confirm Address Details"
          description="Please add and review your details before continuing."
        />

        <div className={styles.stepFormSection}>
          <div className={styles.stepInputGroup}>
            <TextInput
              id="streetAddress"
              label="Street Address"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="Enter street address"
              required
            />
          </div>

          <div className={styles.stepInputGroup}>
            <TextInput
              id="aptSuite"
              label="Apt/Suite (Optional)"
              value={aptSuite}
              onChange={(e) => setAptSuite(e.target.value)}
              placeholder="Enter apartment or suite number"
            />
          </div>

          <div className={styles.addressRow}>
            <div className={styles.stepInputGroup}>
              <TextInput
                id="city"
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city"
                required
              />
            </div>

            <div className={styles.stepInputGroup}>
              <TextInput
                id="state"
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Enter state"
                required
              />
            </div>

            <div className={styles.stepInputGroup}>
              <TextInput
                id="postcode"
                label="Postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="Enter postcode"
                required
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
