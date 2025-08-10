"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RiCloseLine } from "react-icons/ri";
import Image from "next/image";
import Button from "@/components/ui/Button";
import ButtonImageUploader, {
  ButtonImageUploaderRef,
} from "@/lib/actions/ButtonImageUploader";
import Toast from "@/components/ui/Toast";
import styles from "./page.module.css";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import { getCenterGalleryImageProps } from "@/lib/cloudinary/upload-helpers";

interface LocationImage {
  id: string;
  imageUrl: string;
  order?: number;
}

// FIXED: Only accept params as required by Next.js pages
interface GalleryEditPageProps {
  params: Promise<{ id: string }>;
}

export default function GalleryEditPage({ params }: GalleryEditPageProps) {
  const router = useRouter();

  // Get the ID from params
  const [id, setId] = useState<string | null>(null);

  // Initialize ID from params
  useEffect(() => {
    const getId = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    getId();
  }, [params]);

  // Reference to the ImageUploader component
  const uploaderRef = useRef<ButtonImageUploaderRef>(null);

  // Get the appropriate folder and preset for center gallery images
  const { folder, preset } = id
    ? getCenterGalleryImageProps(id)
    : { folder: undefined, preset: undefined };

  // Form state - default empty values
  const [images, setImages] = useState<LocationImage[]>([]);

  // Loading and UI state
  const [loading, setLoading] = useState(true);
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

  // Fetch existing images when ID is available
  const fetchImages = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/marketplace/${id}/images`, {
        credentials: "include",
      });

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
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchImages();
    }
  }, [fetchImages, id]);

  // Handle progress updates during upload
  const handleProgressChange = (progress: number) => {
    setUploadProgress(progress);
    if (progress > 0 && progress < 100) {
      setIsUploading(true);
    } else if (progress === 100) {
      // Keep showing progress bar at 100% briefly
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
    }
  };

  // Handle image upload
  const handleImageUpload = async (imageUrl: string) => {
    try {
      const response = await fetch(`/api/marketplace/${id}/images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      // Get the newly created image
      const newImage = await response.json();

      // Add the new image to the list with the next order number
      setImages((prevImages) => [
        ...prevImages,
        { ...newImage, order: prevImages.length + 1 },
      ]);

      // Show success toast
      setToast({
        visible: true,
        message: "Image uploaded",
        type: "success",
      });
    } catch (err) {
      setToast({
        visible: true,
        message: (err as Error).message,
        type: "error",
      });
    } finally {
      // Reset uploading state
      setIsUploading(false);
    }
  };

  // Handle uploader button click
  const handleUploadClick = () => {
    if (uploaderRef.current) {
      uploaderRef.current.openFileDialog();
    }
  };

  // Handle image deletion
  const handleImageDelete = async (imageId: string) => {
    try {
      const response = await fetch(`/api/marketplace/${id}/images/${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      // Remove the image from the list
      setImages((prevImages) => prevImages.filter((img) => img.id !== imageId));

      setToast({
        visible: true,
        message: "Image deleted",
        type: "success",
      });
    } catch (err) {
      setToast({
        visible: true,
        message: (err as Error).message,
        type: "error",
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, image: LocationImage) => {
    setIsDragging(true);
    setDraggedImage(image);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedImage) return;

    const draggedIndex = images.findIndex((img) => img.id === draggedImage.id);

    if (draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    // Create a new array with the item moved
    const updatedImages = [...images];
    const [removed] = updatedImages.splice(draggedIndex, 1);
    updatedImages.splice(dropIndex, 0, removed);

    // Update the order field for all images
    const reorderedImages = updatedImages.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    setImages(reorderedImages);
    setIsDragging(false);
    setDraggedImage(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedImage(null);
    setDragOverIndex(null);
  };

  // Save function for standalone edit mode
  const handleSave = async () => {
    if (!id || loading) return;

    try {
      // Save the current order in the database
      const response = await fetch(`/api/marketplace/${id}/images/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      setToast({
        visible: true,
        message: "Changes saved successfully",
        type: "success",
      });

      // Navigate back to the marketplace after a brief delay
      setTimeout(() => {
        router.push("/marketplace");
      }, 1500);
    } catch (err) {
      setToast({
        visible: true,
        message: (err as Error).message,
        type: "error",
      });
    }
  };

  const handleClose = () => {
    router.push("/marketplace");
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Show loading while ID or data is loading
  if (!id || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading gallery...</p>
        </div>
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
        variant="edit"
      />

      <div className={styles.container}>
        <div className={styles.subheader}>
          <TitleDescription
            title="Gallery"
            description="Please upload at least one image of your facility. This is required to complete your profile."
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

        {/* Progress bar during upload */}
        {isUploading && uploadProgress > 0 && (
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

        {/* Images grid */}
        {error ? (
          <div className={styles.errorContainer}>
            <p>Error: {error}</p>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className={styles.galleryGrid}>
            {/* Show uploading placeholder while image is being uploaded */}
            {isUploading && (
              <div className={styles.imageContainer}>
                <div className={styles.skeletonImage}>
                  <div className={styles.progressContainer}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {images.length > 0 ? (
              images.map((image, index) => (
                <div
                  key={image.id}
                  className={`${styles.imageContainer} ${
                    isDragging && draggedImage?.id === image.id
                      ? styles.dragging
                      : ""
                  } ${dragOverIndex === index ? styles.dragOver : ""}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, image)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className={styles.imageNumber}>{index + 1}</div>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleImageDelete(image.id)}
                    aria-label="Delete image"
                  >
                    <RiCloseLine />
                  </button>
                  <div className={styles.imageWrapper}>
                    <Image
                      src={image.imageUrl}
                      alt={`Gallery image ${index + 1}`}
                      fill
                      className={styles.image}
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                </div>
              ))
            ) : !isUploading ? (
              <div className={styles.emptyState}>
                <p>No images uploaded yet</p>
                <Button
                  variant="primary"
                  onClick={handleUploadClick}
                  iconPath="/icons/utility-outline/import"
                >
                  Upload First Image
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Only render Toast when visible */}
        {toast.visible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
          />
        )}
      </div>
    </>
  );
}
