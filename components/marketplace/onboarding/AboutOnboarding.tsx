// components/marketplace/AboutOnboarding.tsx - SEPARATE ONBOARDING COMPONENT
"use client";

import { useState, useEffect } from "react";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";
import ImageUploader from "@/lib/actions/ImageUploader";
import Toast from "@/components/ui/Toast";
import { getCenterLogoProps } from "@/lib/cloudinary/upload-helpers";
import styles from "./AboutOnboarding.module.css";

interface AboutOnboardingProps {
  centerId: string;
}

export default function AboutOnboarding({ centerId }: AboutOnboardingProps) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error",
  });

  // Simple form state - always start empty for onboarding
  const [formData, setFormData] = useState({
    highlights: ["", "", ""],
    description: "",
    logo: null as string | null,
  });

  // Get Cloudinary props
  const { folder, preset } = getCenterLogoProps(centerId);

  // Auto-hide toast
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Listen for save event from header
  useEffect(() => {
    const handleSave = () => {
      console.log("🔄 About onboarding save triggered");
      saveData();
    };

    window.addEventListener("marketplaceSave", handleSave);
    return () => window.removeEventListener("marketplaceSave", handleSave);
  }, [formData]); // Re-attach when formData changes

  const saveData = async () => {
    try {
      setSaving(true);

      console.log("💾 Saving about data for center:", centerId);
      console.log("📤 Form data:", formData);

      // Filter out empty highlights
      const nonEmptyHighlights = formData.highlights.filter(
        (h) => h.trim() !== ""
      );

      const payload = {
        highlights: nonEmptyHighlights,
        description: formData.description.trim(),
        logoUrl: formData.logo,
      };

      console.log("📤 API payload:", payload);

      const response = await fetch(`/api/locations/${centerId}/about`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save about information");
      }

      const result = await response.json();
      console.log("✅ About data saved successfully:", result);

      setToast({
        visible: true,
        message: "About information saved successfully!",
        type: "success",
      });
    } catch (error) {
      console.error("❌ Error saving about data:", error);
      setToast({
        visible: true,
        message:
          error instanceof Error ? error.message : "Failed to save information",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...formData.highlights];
    newHighlights[index] = value;
    setFormData({ ...formData, highlights: newHighlights });
  };

  const handleDescriptionChange = (value: string) => {
    setFormData({ ...formData, description: value });
  };

  const handleLogoUpload = (url: string) => {
    console.log("📷 Logo uploaded:", url);
    setFormData({ ...formData, logo: url });
    // NO immediate success toast - wait for save
  };

  const handleLogoError = (error: string) => {
    console.error("❌ Logo upload error:", error);
    setToast({
      visible: true,
      message: `Upload failed: ${error}`,
      type: "error",
    });
  };

  return (
    <div className={styles.container}>
      <TitleDescription
        title="About"
        description="Please include your business description, key facility highlights, and your logo."
      />

      {/* Description */}
      <div className={styles.section}>
        <label className={styles.label}>Description*</label>
        <TextArea
          placeholder="Enter description."
          value={formData.description}
          onChange={handleDescriptionChange}
          maxLength={500}
          showCharCount={true}
        />
      </div>

      {/* Highlights */}
      <div className={styles.section}>
        <label className={styles.label}>Highlights</label>
        <div className={styles.highlightsContainer}>
          {formData.highlights.map((highlight, index) => (
            <TextInput
              key={`highlight-${index}`}
              placeholder={`Highlight #${index + 1}`}
              value={highlight}
              onChange={(value) => handleHighlightChange(index, value)}
              maxLength={20}
              showCharCount={true}
            />
          ))}
        </div>
      </div>

      {/* Logo Upload */}
      <div className={styles.section}>
        <label className={styles.label}>Logo (Optional)</label>
        <ImageUploader
          imageUrl={formData.logo}
          onImageUpload={handleLogoUpload}
          onError={handleLogoError}
          folder={folder}
          preset={preset}
          alt="Center logo"
          label="Upload Logo"
        />
      </div>

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  );
}
