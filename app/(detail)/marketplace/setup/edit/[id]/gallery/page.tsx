// app/(detail)/marketplace/setup/edit/[id]/gallery/page.tsx - FIXED WITH ONBOARDING MODE
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RiCloseLine } from "react-icons/ri";
import Image from "next/image";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import ButtonImageUploader, {
  ButtonImageUploaderRef,
} from "@/lib/actions/ButtonImageUploader";
import Toast from "@/components/ui/Toast";
import styles from "./page.module.css";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getCenterGalleryImageProps } from "@/lib/cloudinary/upload-helpers";

interface LocationImage {
  id: string;
  imageUrl: string;
  order?: number;
}

interface GalleryEditPageProps {
  params?: Promise<{ id: string }>;
  onboardingMode?: boolean;
}

export default function GalleryEditPage({
  params,
  onboardingMode = false,
}: GalleryEditPageProps) {
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

  // Reference to the ImageUploader component
  const uploaderRef = useRef<ButtonImageUploaderRef>(null);

  // Get the appropriate folder and preset for center gallery images
  const cloudinaryProps = id
    ? getCenterGalleryImageProps(id)
    : { folder: "", preset: "" };
  const { folder, preset } = cloudinaryProps;

  const [images, setImages] = useState<LocationImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
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

  // State to track dragging
  const [isDragging, setIsDragging] = useState(false);
  const [draggedImage, setDraggedImage] = useState<LocationImage | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Setup based on mode
  useEffect(() => {
    if (!isInitialized || !id) return;

    console.log(
      `🔧 Setting up Gallery page - Mode: ${onboardingMode ? "ONBOARDING" : "EDIT"}`
    );

    if (onboardingMode) {
      // ONBOARDING MODE: Start with empty gallery, NO FETCHING
      console.log("✅ Onboarding mode: Starting with empty gallery");
      setLoading(false);

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
    } else {
      // EDIT MODE: Fetch existing images
      console.log("📡 Edit mode: Fetching existing images");
      fetchImages();
    }
  }, [id, onboardingMode, isInitialized]);

  // Fetch the images for this location
  const fetchImages = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/locations/${id}/images`);

      if (!response.ok) {
        throw new Error("Failed to fetch images");
      }

      const data = await response.json();

      // Ensure each image has a numerical index for ordering
      const imagesWithOrder = data.map((img: LocationImage, index: number) => ({
        ...img,
        order: index + 1,
      }));

      setImages(imagesWithOrder);
    } catch (err) {
      console.error("Error fetching images:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Handle image upload
  const handleImageUpload = (imageUrl: string) => {
    console.log("📷 Image uploaded successfully:", imageUrl);
    const newImage: LocationImage = {
      id: `temp-${Date.now()}`, // Temporary ID for new images
      imageUrl,
      order: images.length + 1,
    };
    setImages((prev) => [...prev, newImage]);
  };

  // Handle upload progress
  const handleProgressChange = (progress: number) => {
    setUploadProgress(progress);
    setIsUploading(progress > 0 && progress < 100);
  };

  // Handle upload button click
  const handleUploadClick = () => {
    if (uploaderRef.current) {
      uploaderRef.current.openFilePicker();
    }
  };

  // Handle image deletion
  const deleteImage = async (imageId: string) => {
    try {
      // If it's a temporary image (not saved to DB yet), just remove from state
      if (imageId.startsWith("temp-")) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        return;
      }

      const response = await fetch(`/api/locations/${id}/images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      // Remove from local state
      setImages((prev) => prev.filter((img) => img.id !== imageId));

      setToast({
        visible: true,
        message: "Image deleted successfully",
        type: "success",
      });
    } catch (err) {
      console.error("Error deleting image:", err);
      setToast({
        visible: true,
        message: (err as Error).message,
        type: "error",
      });
    }
  };

  // Handle drag start
  const handleDragStart = (image: LocationImage) => {
    setIsDragging(true);
    setDraggedImage(image);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedImage) return;

    const dragIndex = images.findIndex((img) => img.id === draggedImage.id);
    if (dragIndex === dropIndex) return;

    // Reorder images
    const newImages = [...images];
    const [removed] = newImages.splice(dragIndex, 1);
    newImages.splice(dropIndex, 0, removed);

    // Update order numbers
    const updatedImages = newImages.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setImages(updatedImages);
    setIsDragging(false);
    setDraggedImage(null);
    setDragOverIndex(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedImage(null);
    setDragOverIndex(null);
  };

  // Handle save button click
  const handleSave = async () => {
    if (!id || saving) return;

    try {
      setSaving(true);
      console.log("💾 Saving gallery data for center:", id);

      // Save new images and update order
      const payload = {
        images: images.map((img, index) => ({
          id: img.id.startsWith("temp-") ? undefined : img.id,
          imageUrl: img.imageUrl,
          order: index + 1,
        })),
      };

      console.log("📤 Saving gallery payload:", payload);

      const response = await fetch(`/api/locations/${id}/images`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save gallery");
      }

      console.log("✅ Gallery saved successfully");

      setToast({
        visible: true,
        message: "Gallery saved successfully!",
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
      console.error("❌ Error saving gallery:", error);
      setToast({
        visible: true,
        message:
          error instanceof Error ? error.message : "Failed to save gallery",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    router.push(`/locations/${id}`);
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
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
          <p>Loading gallery...</p>
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
          onCancel={handleClose}
          isLoading={saving}
        />
      )}

      <div className={styles.formContainer}>
        <div className={styles.subheader}>
          <TitleDescription
            title="Gallery"
            description="Add videos and photos of your venue, in addition to selecting your top picks."
          />

          <Button
            variant="secondary"
            size="md"
            iconPath="/icons/utility-outline/import"
            onClick={handleUploadClick}
          >
            Upload
          </Button>
        </div>

        <ButtonImageUploader
          ref={uploaderRef}
          onUpload={handleImageUpload}
          onProgressChange={handleProgressChange}
          onError={(error) =>
            setToast({
              visible: true,
              message: error,
              type: "error",
            })
          }
          folder={folder}
          preset={preset}
        />

        {images.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path
                  d="M40 38H8V16H40V38Z"
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 24L24 32L32 24"
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className={styles.emptyStateTitle}>No images yet</h3>
            <p className={styles.emptyStateDescription}>
              Upload images to showcase your venue to potential customers.
            </p>
          </div>
        ) : (
          <div className={styles.imageGrid}>
            {images.map((image, index) => (
              <div
                key={image.id}
                className={`${styles.imageCard} ${
                  dragOverIndex === index ? styles.dragOver : ""
                }`}
                draggable
                onDragStart={() => handleDragStart(image)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className={styles.imageContainer}>
                  <Image
                    src={image.imageUrl}
                    alt={`Gallery image ${index + 1}`}
                    fill
                    className={styles.image}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <button
                    className={styles.deleteButton}
                    onClick={() => deleteImage(image.id)}
                  >
                    <RiCloseLine size={16} />
                  </button>
                </div>
                <div className={styles.imageOrder}>#{image.order}</div>
              </div>
            ))}
          </div>
        )}

        {isUploading && (
          <div className={styles.uploadProgress}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className={styles.progressText}>{uploadProgress}%</span>
          </div>
        )}
      </div>

      {/* Only render Toast when visible */}
      {toast.visible && (
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}
    </div>
  );
}
