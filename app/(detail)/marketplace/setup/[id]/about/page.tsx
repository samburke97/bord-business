// app/(detail)/marketplace/setup/edit/[id]/about/page.tsx - NEW PATTERN
"use client";

import { useState, useEffect } from "react";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";
import ImageUploader from "@/lib/actions/ImageUploader";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import Toast from "@/components/ui/Toast";
import styles from "./page.module.css";
import { getCenterLogoProps } from "@/lib/cloudinary/upload-helpers";

interface EditAboutPageProps {
  centerId?: string;
  formData?: {
    highlights: string[];
    description: string;
    logo: string | null;
  };
  onContinue?: (data: any) => void;
  // Legacy props for standalone edit mode
  params?: Promise<{ id: string }>;
}

export default function EditAboutPage({
  centerId,
  formData: initialFormData,
  onContinue,
  params,
}: EditAboutPageProps) {
  // Determine if we're in setup mode (parent manages data) or standalone edit mode
  const isSetupMode = !!centerId && !!onContinue;

  // For standalone mode, we need to get ID from params
  const [standaloneId, setStandaloneId] = useState<string | null>(null);
  const id = isSetupMode ? centerId : standaloneId;

  // Initialize standalone mode ID
  useEffect(() => {
    if (!isSetupMode && params) {
      const getId = async () => {
        const resolvedParams = await params;
        setStandaloneId(resolvedParams.id);
      };
      getId();
    }
  }, [params, isSetupMode]);

  // Form state - initialized from parent data in setup mode
  const [localFormData, setLocalFormData] = useState({
    highlights: initialFormData?.highlights || ["", "", ""],
    description: initialFormData?.description || "",
    logo: initialFormData?.logo || null,
  });

  // Loading state for data fetching
  const [isLoadingData, setIsLoadingData] = useState(false);

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

  // Fetch existing data in setup mode to prefill form
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!id || !isSetupMode) return;

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
        // Continue with empty form on error
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchExistingData();
  }, [id, isSetupMode]);

  // Cloudinary configuration
  const cloudinaryProps = id
    ? getCenterLogoProps(id)
    : { folder: "", preset: "" };
  const { folder, preset } = cloudinaryProps;

  // UI state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error",
  });

  // Handle continue for setup mode
  const handleContinue = () => {
    if (isSetupMode && onContinue) {
      onContinue(localFormData);
    }
  };

  // Expose handleContinue to window for header button
  useEffect(() => {
    if (isSetupMode) {
      // @ts-ignore
      window.handleStepContinue = handleContinue;

      return () => {
        // @ts-ignore
        delete window.handleStepContinue;
      };
    }
  }, [localFormData, isSetupMode]);

  // Save function for standalone edit mode
  const handleSave = async () => {
    if (!id || saving || isSetupMode) return;

    try {
      setSaving(true);

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

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setLocalFormData({ ...localFormData, description: e.target.value });
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

  // Don't render until we have an ID
  if (!id) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching existing data in setup mode
  if (isSetupMode && isLoadingData) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading existing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Only show ActionHeader in standalone edit mode */}
      {!isSetupMode && (
        <ActionHeader
          onSave={handleSave}
          onCancel={() => (router.push("/marketplace"))}
          isLoading={saving}
        />
      )}

      <div className={styles.formContainer}>
        <TitleDescription
          title="About"
          description="Please include your business description, key facility highlights, and your logo."
        />

        {/* Description */}
        <div className={styles.section}>
          <label className={styles.label}>Description*</label>
          <TextArea
            id="description"
            placeholder="Enter description."
            value={localFormData.description}
            onChange={handleDescriptionChange}
            maxLength={500}
            showCharCount={true}
          />
        </div>

        {/* Highlights */}
        <div className={styles.section}>
          <label className={styles.label}>Highlights</label>
          <div className={styles.highlightsContainer}>
            {localFormData.highlights.map((highlight, index) => (
              <TextInput
                key={index}
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
