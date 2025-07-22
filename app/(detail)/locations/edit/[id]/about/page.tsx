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

export default function EditAboutPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Get the appropriate folder and preset for center logo uploads
  const { folder, preset } = getCenterLogoProps(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const [formData, setFormData] = useState({
    highlights: ["", "", ""],
    description: "",
    logo: null as string | null,
  });

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);

        // Fetch about data
        const aboutResponse = await fetch(`/api/locations/${id}/about`);
        if (!aboutResponse.ok) {
          throw new Error("Failed to fetch location about data");
        }
        const aboutData = await aboutResponse.json();

        // Format the data for our form
        setFormData({
          highlights: aboutData.highlights?.length
            ? aboutData.highlights.slice(0, 3)
            : ["", "", ""],
          description: aboutData.description || "",
          logo: aboutData.logoUrl || null,
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchLocationData();
    }
  }, [id]);

  // Handle input changes for highlights
  const handleHighlightChange = (index: number, value: string) => {
    const updatedHighlights = [...formData.highlights];
    updatedHighlights[index] = value;
    setFormData({ ...formData, highlights: updatedHighlights });
  };

  // Handle description change
  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, description: e.target.value });
  };

  // Handle successful logo upload
  const handleLogoUploaded = (url: string) => {
    setFormData({ ...formData, logo: url });
    setToast({
      visible: true,
      message: "Logo uploaded successfully",
      type: "success",
    });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Handle logo upload error
  const handleLogoUploadError = (errorMessage: string) => {
    setToast({
      visible: true,
      message: `Error uploading logo: ${errorMessage}`,
      type: "error",
    });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleLogoDelete = () => {
    setFormData({ ...formData, logo: null });
  };

  const handleClose = () => {
    router.push(`/locations/${id}`);
  };

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      // Filter out empty highlights
      const filteredHighlights = formData.highlights.filter(
        (h) => h.trim().length > 0
      );

      const payload = {
        highlights: filteredHighlights,
        description: formData.description,
        logoUrl: formData.logo,
      };

      const response = await fetch(`/api/locations/${id}/about`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to update about information"
        );
      }

      setToast({
        visible: true,
        message: "About information updated successfully",
        type: "success",
      });

      // Navigate back to the location detail page after a short delay
      setTimeout(() => {
        router.push(`/locations/${id}`);
      }, 1500);
    } catch (err) {
      setToast({
        visible: true,
        message: (err as Error).message || "Failed to update about information",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>Error loading about information: {error}</p>
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
    <>
      <ActionHeader
        primaryAction={handleSave}
        secondaryAction={handleClose}
        primaryLabel="Save"
        secondaryLabel="Close"
        isProcessing={saving}
      />
      <div className={styles.container}>
        <div className={styles.content}>
          <TitleDescription
            title="About"
            description="Please add the locations highlights and description."
          />

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Highlights</h2>
            <div className={styles.highlightsContainer}>
              {formData.highlights.map((highlight, index) => (
                <TextInput
                  key={`highlight-${index}`}
                  id={`highlight-${index}`}
                  value={highlight}
                  onChange={(e) => handleHighlightChange(index, e.target.value)}
                  placeholder={`Highlight #${index + 1}`}
                  maxLength={20}
                  showCharCount
                />
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Description</h2>
            <TextArea
              id="description"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Enter description."
              maxLength={500}
              showCharCount
              rows={6}
            />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {formData.logo ? "Location Logo" : "Add Logo"}
            </h2>

            <div className={styles.logoContainer}>
              <div className={styles.logoWrapper}>
                <ImageUploader
                  imageUrl={formData.logo}
                  onImageUpload={handleLogoUploaded}
                  onError={handleLogoUploadError}
                  folder={folder}
                  preset={preset}
                  size="xl"
                  alt="Location Logo"
                  className={styles.logoUploader}
                  showDeleteButton={true}
                  onImageDelete={handleLogoDelete}
                />
              </div>
            </div>
          </div>
        </div>

        {toast.visible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
          />
        )}
      </div>
    </>
  );
}
