// components/locations/BusinessNameStep.tsx - CONSISTENT VERSION
"use client";

import { useState, useEffect } from "react";
import TextInput from "@/components/ui/TextInput";
import TitleDescription from "@/components/ui/TitleDescription";
import styles from "./BusinessNameStep.module.css";

interface BusinessNameStepProps {
  formData: {
    businessName: string;
  };
  onContinue: (data: any) => void;
}

export default function BusinessNameStep({
  formData,
  onContinue,
}: BusinessNameStepProps) {
  const [businessName, setBusinessName] = useState(formData.businessName || "");
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }

    if (businessName.length > 50) {
      setError("Business name must be 50 characters or less");
      return;
    }

    onContinue({
      businessName: businessName.trim(),
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
  }, [businessName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusinessName(e.target.value);
    setError(null);
  };

  return (
    <div className={styles.stepPageContainer}>
      <div className={styles.stepContainer}>
        <TitleDescription
          title="What's your business name?"
          description="This is your brand name, the name players will see. Your legal name can be added later."
        />

        <div className={styles.stepFormSection}>
          <div className={styles.stepInputGroup}>
            <TextInput
              id="businessName"
              label="Business Name"
              value={businessName}
              onChange={handleNameChange}
              placeholder="Enter your business name"
              maxLength={50}
              showCharCount={true}
              error={error}
              required
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  );
}
