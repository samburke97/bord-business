"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";
import ImageUploader from "@/lib/actions/ImageUploader";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import Toast from "@/components/ui/Toast";
import styles from "./page.module.css";
import { getCenterLogoProps } from "@/lib/cloudinary/upload-helpers";

// FIXED: Make this work for both Next.js pages AND component usage
interface EditAboutPageProps {
  params: Promise<{ id: string }>;
  // When used as component in setup flow, these will be passed via a wrapper
  centerId?: string;
  formData?: {
    highlights: string[];
    description: string;
    logo: string | null;
  };
  onContinue?: (data: any) => void;
}

export default function EditAboutPage({
  params,
  centerId,
  formData: initialFormData,
  onContinue,
}: EditAboutPageProps) {
  const router = useRouter();

  // Get ID either from centerId prop (setup mode) or params (page mode)
  const [id, setId] = useState<string | null>(centerId || null);
  const isSetupMode = !!centerId && !!onContinue;

  // Initialize ID from params if not in setup mode
  useEffect(() => {
    if (!centerId) {
      const getId = async () => {
        const resolvedParams = await params;
        setId(resolvedParams.id);
      };
      getId();
    }
  }, [params, centerId]);

  // Form state - initialized from parent data in setup mode
  const [localFormData, setLocalFormData] = useState({
    highlights: initialFormData?.highlights || ["", "", ""],
    description: initialFormData?.description || "",
    logo: initialFormData?.logo || null,
  });

  // Loading state for data fetching
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Track if validation was attempted and description error
  const [showDescriptionError, setShowDescriptionError] = useState(false);

  // Update local form data when parent data changes
  useEffect(() => {
    if (isSetupMode && initialFormData) {
      setLocalFormData({
        highlights: initialFormData.highlights,
        description: initialFormData.description,
        logo: initialFormData.logo,
      });
    }
  }, [initialFormData, isSetupMode]);

  // Fetch existing data when ID is available (for both modes)
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!id) return;

      // In setup mode, only fetch if we don't have initial data
      if (isSetupMode && initialFormData) return;

      try {
        setIsLoadingData(true);

        const response = await fetch(`/api/marketplace/${id}/about`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();

          // Always ensure we have exactly 3 highlight slots
          const existingHighlights = data.highlights || [];
          const paddedHighlights = [
            existingHighlights[0] || "",
            existingHighlights[1] || "",
            existingHighlights[2] || "",
          ];

          setLocalFormData({
            highlights: paddedHighlights,
            description: data.description || "",
            logo: data.logoUrl || null,
          });
        }
      } catch (error) {
        console.error("Error fetching about data:", error);
        // Continue with empty form on error
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchExistingData();
  }, [id, isSetupMode, initialFormData]);

  // Cloudinary configuration
  const cloudinaryProps = id
    ? getCenterLogoProps(id)
    : {
        folder: "logos",
        preset: "business_images",
      };
  const { folder, preset } = cloudinaryProps;

  // UI state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error",
  });

  // Check if description is valid
  const isDescriptionValid = () => {
    return localFormData.description.trim().length >= 10;
  };

  // Handle continue with basic validation
  const handleContinue = () => {
    if (isSetupMode && onContinue) {
      // Check if description is valid
      if (!isDescriptionValid()) {
        setShowDescriptionError(true);
        return; // Don't continue
      }

      // Clear error and continue
      setShowDescriptionError(false);
      onContinue(localFormData);
    }
  };

  // Set up window function for continue button
  useEffect(() => {
    if (isSetupMode) {
      // @ts-ignore
      window.marketplaceSetup = window.marketplaceSetup || {};
      // @ts-ignore
      window.marketplaceSetup.handleStepContinue = handleContinue;

      return () => {
        // @ts-ignore
        if (window.marketplaceSetup) {
          delete window.marketplaceSetup.handleStepContinue;
        }
      };
    }
  }, [localFormData, isSetupMode]);

  // Save function for standalone edit mode
  const handleSave = async () => {
    if (!id || saving || isSetupMode) return;

    // Validate first
    if (!isDescriptionValid()) {
      setShowDescriptionError(true);
      return;
    }

    try {
      setSaving(true);
      setShowDescriptionError(false);

      const payload = {
        highlights: localFormData.highlights.filter((h) => h.trim() !== ""),
        description: localFormData.description.trim(),
        logoUrl: localFormData.logo,
      };

      const response = await fetch(`/api/marketplace/${id}/about`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to save about information");
      }

      setToast({
        visible: true,
        message: "About information saved successfully!",
        type: "success",
      });

      // Redirect after delay in standalone mode
      setTimeout(() => {
        router.push("/marketplace");
      }, 1500);
    } catch (error) {
      setToast({
        visible: true,
        message: "Failed to save about information",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Form handlers
  const handleHighlightChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newHighlights = [...localFormData.highlights];
    newHighlights[index] = e.target.value;
    setLocalFormData({ ...localFormData, highlights: newHighlights });
  };

  // Description change handler that clears error when valid
  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setLocalFormData({ ...localFormData, description: value });

    // Clear error if description becomes valid
    if (showDescriptionError && value.trim().length >= 10) {
      setShowDescriptionError(false);
    }
  };

  const handleLogoUpload = (url: string) => {
    setLocalFormData({ ...localFormData, logo: url });
  };

  const handleLogoError = (error: string) => {
    setToast({
      visible: true,
      message: `Upload failed: ${error}`,
      type: "error",
    });
  };

  // Show loading while ID or data is loading
  if (!id || isLoadingData) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Get error message for description
  const getDescriptionError = () => {
    if (!showDescriptionError) return null;

    if (localFormData.description.trim().length === 0) {
      return "Description is required";
    }

    if (localFormData.description.trim().length < 10) {
      return "Description must be at least 10 characters";
    }

    return null;
  };

  return (
    <div className={styles.container}>
      {/* Only show ActionHeader in standalone edit mode */}
      {!isSetupMode && (
        <ActionHeader
          primaryAction={handleSave}
          secondaryAction={() => router.push("/marketplace")}
          isProcessing={saving}
        />
      )}

      <div className={styles.formContainer}>
        <TitleDescription
          title="About"
          description="Please include your business description, key facility highlights, and your logo."
        />

        {/* Description - Show error when showDescriptionError is true */}
        <div className={styles.section}>
          <label className={styles.label}>Description*</label>
          <TextArea
            id="description"
            placeholder="Enter description (minimum 10 characters)."
            value={localFormData.description}
            onChange={handleDescriptionChange}
            maxLength={500}
            showCharCount={true}
            required
            error={getDescriptionError()}
          />
        </div>

        {/* Highlights */}
        <div className={styles.section}>
          <label className={styles.label}>Highlights</label>
          <div className={styles.highlightsContainer}>
            {localFormData.highlights.map((highlight, index) => (
              <TextInput
                key={index}
                id={`highlight-${index}`}
                label={`Highlight ${index + 1}`}
                value={highlight}
                onChange={(e) => handleHighlightChange(index, e)}
                placeholder={`Enter highlight ${index + 1}`}
                maxLength={100}
              />
            ))}
          </div>
        </div>

        {/* Logo */}
        <div className={styles.section}>
          <label className={styles.label}>Logo</label>
          <ImageUploader
            folder={folder}
            preset={preset}
            onUpload={handleLogoUpload}
            onError={handleLogoError}
            initialImage={localFormData.logo}
            aspectRatio="1:1"
            showProgress={true}
          />
        </div>
      </div>

      {/* Only render Toast when visible */}
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
