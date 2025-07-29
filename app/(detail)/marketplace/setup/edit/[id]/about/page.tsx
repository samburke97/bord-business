// app/(detail)/marketplace/setup/edit/[id]/about/page.tsx - FIXED CONSOLIDATED APPROACH
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

    // ✅ FIXED: ALWAYS fetch existing data first (both modes)
    console.log("📡 Fetching existing data (if any)");
    fetchLocationData();

    if (onboardingMode) {
      // ONBOARDING MODE: Also set up event listener for save
      console.log("✅ Onboarding mode: Setting up save listener");

      const handleOnboardingSave = () => {
        console.log("🔄 Onboarding save triggered from header");
        handleSave();
      };

      // Clean up any existing listeners first
      window.removeEventListener("marketplaceSave", handleOnboardingSave);
      window.addEventListener("marketplaceSave", handleOnboardingSave);

      return () => {
        window.removeEventListener("marketplaceSave", handleOnboardingSave);
      };
    }
    // EDIT MODE: Just fetch data (already done above)
  }, [id, onboardingMode, isInitialized]);

  const fetchLocationData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      console.log("📡 Fetching about data for center:", id);
      const response = await fetch(`/api/locations/${id}/about`);

      if (response.status === 404) {
        // No about data exists yet - this is fine for onboarding
        console.log(
          "📝 No existing about data found - starting with empty form"
        );
        setFormData({
          highlights: ["", "", ""],
          description: "",
          logo: null,
        });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch about data");
      }

      const data = await response.json();
      console.log("📊 Fetched about data:", data);

      // Handle highlights safely
      let highlightsArray: string[] = ["", "", ""];

      if (data.highlights) {
        if (Array.isArray(data.highlights)) {
          highlightsArray = data.highlights
            .slice(0, 3)
            .map((h) => String(h || ""));
        } else if (
          typeof data.highlights === "object" &&
          data.highlights !== null
        ) {
          const values = Object.values(data.highlights);
          highlightsArray = values.slice(0, 3).map((h) => String(h || ""));
        }

        // Ensure exactly 3 elements
        while (highlightsArray.length < 3) {
          highlightsArray.push("");
        }
      }

      // ✅ POPULATE form with existing data
      setFormData({
        highlights: highlightsArray,
        description: data.description || "",
        logo: data.logoUrl || null,
      });

      console.log("✅ Form populated with existing data");
    } catch (error) {
      console.error("❌ Error fetching about data:", error);

      // ✅ GRACEFUL FALLBACK: Don't show error in onboarding mode, just use empty form
      if (onboardingMode) {
        console.log("🔄 Onboarding mode: Using empty form as fallback");
        setFormData({
          highlights: ["", "", ""],
          description: "",
          logo: null,
        });
      } else {
        setError("Failed to load about information");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || saving) return;

    try {
      setSaving(true);
      console.log("💾 Saving about data for center:", id);

      const payload = {
        highlights: formData.highlights.filter((h) => h.trim() !== ""),
        description: formData.description.trim(),
        logo: formData.logo,
      };

      console.log("📤 Saving payload:", payload);

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

      console.log("✅ About data saved successfully");

      // Show success toast
      setToast({
        visible: true,
        message: "About information saved successfully!",
        type: "success",
      });

      // ✅ FIXED: In onboarding mode, trigger navigation by calling router.push
      if (onboardingMode) {
        // This will be intercepted by OnboardingStepWrapper and advance to next step
        console.log("🔄 Onboarding mode: Triggering navigation to next step");
        router.push(`/locations/${id}`);
      } else {
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

  // ✅ FIXED: Proper event handler signatures
  const handleHighlightChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newHighlights = [...formData.highlights];
    newHighlights[index] = e.target.value; // Extract value from event
    setFormData({ ...formData, highlights: newHighlights });
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, description: e.target.value }); // Extract value from event
  };

  const handleLogoUpload = (url: string) => {
    console.log("📷 Logo uploaded successfully:", url);
    setFormData({ ...formData, logo: url });
    // ✅ REMOVED: Don't show any immediate toast for upload
    console.log("🔍 Logo upload - NOT showing toast");
  };

  const handleLogoError = (error: string) => {
    console.error("❌ Logo upload error:", error);
    console.log("🔍 Logo upload error - showing error toast");
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
            id="description"
            placeholder="Enter description."
            value={formData.description}
            onChange={handleDescriptionChange} // ✅ FIXED: Pass event directly
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
                id={`highlight-${index}`}
                placeholder={`Highlight #${index + 1}`}
                value={highlight}
                onChange={(e) => handleHighlightChange(index, e)} // ✅ FIXED: Pass event object
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
