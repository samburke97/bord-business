// components/marketplace/MarketplaceAboutStep.tsx
"use client";

import { useState, useEffect } from "react";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";
import TitleDescription from "@/components/ui/TitleDescription";
import Button from "@/components/ui/Button";
import styles from "./MarketplaceStep.module.css";

interface MarketplaceAboutStepProps {
  formData: {
    description: string;
    highlights: string[];
    logo: string | null;
  };
  onContinue: (data: any) => void;
  businessId: string | null;
}

export default function MarketplaceAboutStep({
  formData,
  onContinue,
  businessId,
}: MarketplaceAboutStepProps) {
  const [description, setDescription] = useState(formData.description || "");
  const [highlights, setHighlights] = useState(
    formData.highlights || ["", "", ""]
  );
  const [logo, setLogo] = useState<string | null>(formData.logo || null);
  const [isUploading, setIsUploading] = useState(false);

  // Ensure we have 3 highlight slots
  useEffect(() => {
    if (highlights.length < 3) {
      const newHighlights = [...highlights];
      while (newHighlights.length < 3) {
        newHighlights.push("");
      }
      setHighlights(newHighlights);
    }
  }, [highlights]);

  const handleContinue = () => {
    // Filter out empty highlights
    const filteredHighlights = highlights.filter((h) => h.trim().length > 0);

    onContinue({
      description: description.trim(),
      highlights: filteredHighlights,
      logo,
    });
  };

  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    setHighlights(newHighlights);
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !businessId) return;

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");

      const response = await fetch(`/api/business/${businessId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      const data = await response.json();
      setLogo(data.url);
    } catch (error) {
      console.error("Error uploading logo:", error);
      // You might want to show a toast notification here
    } finally {
      setIsUploading(false);
    }
  };

  // Expose the continue handler for the header button
  useEffect(() => {
    // @ts-ignore
    window.handleStepContinue = handleContinue;

    return () => {
      // @ts-ignore
      delete window.handleStepContinue;
    };
  }, [description, highlights, logo]);

  return (
    <div className={styles.stepPageContainer}>
      <div className={styles.stepContainer}>
        <TitleDescription
          title="About Your Business"
          description="Tell customers about your business with a compelling description and key highlights."
        />

        <div className={styles.formSection}>
          <div className={styles.field}>
            <label className={styles.label}>Description*</label>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a detailed description of your business..."
              rows={5}
              maxLength={500}
            />
            <div className={styles.charCount}>{description.length}/500</div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Key Highlights</label>
            <div className={styles.description}>
              Add up to 3 key features or benefits that make your business stand
              out.
            </div>

            {highlights.slice(0, 3).map((highlight, index) => (
              <div key={index} className={styles.highlightField}>
                <TextInput
                  value={highlight}
                  onChange={(e) => handleHighlightChange(index, e.target.value)}
                  placeholder={`Highlight #${index + 1}`}
                  maxLength={50}
                />
                <div className={styles.charCount}>{highlight.length}/50</div>
              </div>
            ))}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Logo (Optional)</label>
            <div className={styles.logoUploadContainer}>
              {logo ? (
                <div className={styles.logoPreview}>
                  <img
                    src={logo}
                    alt="Business logo"
                    className={styles.logoImage}
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setLogo(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className={styles.logoUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className={styles.fileInput}
                    id="logo-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="logo-upload" className={styles.uploadLabel}>
                    <div className={styles.uploadIcon}>📷</div>
                    <div className={styles.uploadText}>
                      {isUploading ? "Uploading..." : "Add Logo"}
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Continue Button */}
        <div className={styles.mobileButtonContainer}>
          <Button
            variant="primary-green"
            onClick={handleContinue}
            disabled={!description.trim()}
            className={styles.continueButton}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
