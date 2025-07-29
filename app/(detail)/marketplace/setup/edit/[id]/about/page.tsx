// app/(detail)/marketplace/setup/edit/[id]/about/page.tsx - ONBOARDING MODE FIXED
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import TitleDescription from "@/components/ui/TitleDescription";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";
import ImageUploader from "@/lib/actions/ImageUploader";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import Toast from "@/components/ui/Toast";
import styles from "./page.module.css";
import { getCenterLogoProps } from "@/lib/cloudinary/upload-helpers";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface EditAboutPageProps {
  params?: Promise<{ id: string }>;
  onboardingMode?: boolean;
}

export default function EditAboutPage({
  params,
  onboardingMode = false,
}: EditAboutPageProps) {
  const routerParams = useParams();
  const router = useRouter();

  // Handle both direct params and useParams
  const [id, setId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize ID from params
  useEffect(() => {
    const getId = async () => {
      if (params) {
        const resolvedParams = await params;
        setId(resolvedParams.id);
      } else if (routerParams?.id) {
        setId(routerParams.id as string);
      }
      setIsInitialized(true);
    };
    getId();
  }, [params, routerParams]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error",
  });

  // Always start with empty form data
  const [formData, setFormData] = useState({
    highlights: ["", "", ""],
    description: "",
    logo: null as string | null,
  });

  // Get Cloudinary props only when ID is available
  const cloudinaryProps = id
    ? getCenterLogoProps(id)
    : { folder: "", preset: "" };
  const { folder, preset } = cloudinaryProps;

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Setup based on mode
  useEffect(() => {
    if (!isInitialized || !id) return;

    console.log(
      `🔧 Setting up About page - Mode: ${onboardingMode ? "ONBOARDING" : "EDIT"}`
    );

    if (onboardingMode) {
      // ONBOARDING MODE: Start with empty data, NO FETCHING
      console.log("✅ Onboarding mode: Starting with empty form");
      setLoading(false);

      const handleOnboardingSave = () => {
        console.log("🔄 Onboarding save triggered from header");
        handleSave();
      };

      // Clean up any existing listeners
      window.removeEventListener("marketplaceSave", handleOnboardingSave);
      window.addEventListener("marketplaceSave", handleOnboardingSave);

      return () => {
        window.removeEventListener("marketplaceSave", handleOnboardingSave);
      };
    } else {
      // EDIT MODE: Fetch existing data
      console.log("📡 Edit mode: Fetching existing data");
      fetchLocationData();
    }
  }, [id, onboardingMode, isInitialized]);

  const fetchLocationData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      console.log("📡 Fetching about data for center:", id);

      const aboutResponse = await fetch(`/api/locations/${id}/about`);
      if (!aboutResponse.ok) {
        throw new Error("Failed to fetch location about data");
      }
      const aboutData = await aboutResponse.json();

      console.log("📊 Fetched about data:", aboutData);

      // Handle highlights safely
      let highlightsArray: string[] = ["", "", ""];

      if (aboutData.highlights) {
        if (Array.isArray(aboutData.highlights)) {
          highlightsArray = aboutData.highlights
            .slice(0, 3)
            .map((h) => String(h || ""));
        } else if (
          typeof aboutData.highlights === "object" &&
          aboutData.highlights !== null
        ) {
          const values = Object.values(aboutData.highlights);
          highlightsArray = values.slice(0, 3).map((h) => String(h || ""));
        }

        // Ensure exactly 3 elements
        while (highlightsArray.length < 3) {
          highlightsArray.push("");
        }
      }

      setFormData({
        highlights: highlightsArray,
        description: aboutData.description || "",
        logo: aboutData.logoUrl || null,
      });
    } catch (error) {
      console.error("❌ Error fetching about data:", error);
      setError("Failed to load about information");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) {
      console.error("❌ Cannot save: No center ID available");
      setToast({
        visible: true,
        message: "Error: No center ID available",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      console.log("💾 Saving about data for center:", id);
      console.log("📤 Form data being saved:", formData);

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

      const response = await fetch(`/api/locations/${id}/about`, {
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
      console.log("✅ Save successful:", result);

      // Show success message
      setToast({
        visible: true,
        message: "About information saved successfully!",
        type: "success",
      });

      // In onboarding mode, parent handles navigation
      if (!onboardingMode) {
        // In edit mode, redirect after delay
        setTimeout(() => {
          router.push(`/locations/${id}`);
        }, 1500);
      }
    } catch (error) {
      console.error("❌ Error saving about data:", error);
      setToast({
        visible: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save about information",
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
    console.log("📷 Logo uploaded successfully:", url);
    setFormData({ ...formData, logo: url });
    // Don't show toast - will show when saved
  };

  const handleLogoError = (error: string) => {
    console.error("❌ Logo upload error:", error);
    setToast({
      visible: true,
      message: `Upload failed: ${error}`,
      type: "error",
    });
  };

  // Show loading if not initialized
  if (!isInitialized) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  // Show loading during data fetch (edit mode only)
  if (loading && !onboardingMode) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p>Loading about information...</p>
        </div>
      </div>
    );
  }

  // Show error state (edit mode only)
  if (error && !onboardingMode) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Only show ActionHeader in edit mode */}
      {!onboardingMode && (
        <ActionHeader
          onSave={handleSave}
          onCancel={() => router.push(`/locations/${id}`)}
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
          {folder && preset ? (
            <ImageUploader
              imageUrl={formData.logo}
              onImageUpload={handleLogoUpload}
              onError={handleLogoError}
              folder={folder}
              preset={preset}
              alt="Center logo"
              label="Upload Logo"
            />
          ) : (
            <div
              style={{
                padding: "1rem",
                background: "#f3f4f6",
                borderRadius: "8px",
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              Logo upload initializing...
            </div>
          )}
        </div>
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
