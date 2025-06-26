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
// Import the helper function for center gallery images
import { getCenterGalleryImageProps } from "@/lib/cloudinary/upload-helpers";

interface LocationImage {
  id: string;
  imageUrl: string;
  order?: number;
}

export default function GalleryEditPage() {
  // Use the hooks pattern for params in the App Router
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  // Reference to the ImageUploader component
  const uploaderRef = useRef<ButtonImageUploaderRef>(null);

  // Get the appropriate folder and preset for center gallery images
  const { folder, preset } = getCenterGalleryImageProps(id);

  const [images, setImages] = useState<LocationImage[]>([]);
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
      const response = await fetch(`/api/locations/${id}/images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
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
      console.error("Error uploading image:", err);
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
      const response = await fetch(`/api/locations/${id}/images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      // Remove the image from the list and re-number remaining images
      setImages((prevImages) => {
        const filteredImages = prevImages.filter((img) => img.id !== imageId);
        return filteredImages.map((img, index) => ({
          ...img,
          order: index + 1,
        }));
      });

      setToast({
        visible: true,
        message: "Image removed",
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
  const handleDragStart = (
    e: React.DragEvent,
    image: LocationImage,
    index: number
  ) => {
    setIsDragging(true);
    setDraggedImage(image);
    // Store the index in the dataTransfer
    e.dataTransfer.setData("text/plain", index.toString());
    // Set effectAllowed to move
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedImage) return;

    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"));

    if (dragIndex === dropIndex) return;

    const items = Array.from(images);
    const [removed] = items.splice(dragIndex, 1);
    items.splice(dropIndex, 0, removed);

    // Update the order property for each image
    const updatedImages = items.map((item, index) => ({
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
    try {
      // Update the order of images in the database
      const response = await fetch(`/api/locations/${id}/images/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images }),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      setToast({
        visible: true,
        message: "Changes saved successfully",
        type: "success",
      });

      // Navigate back to the location detail page after a brief delay
      setTimeout(() => {
        router.push(`/locations/${id}`);
      }, 1500);
    } catch (err) {
      console.error("Error saving changes:", err);
      setToast({
        visible: true,
        message: (err as Error).message,
        type: "error",
      });
    }
  };

  const handleClose = () => {
    router.push(`/locations/${id}`);
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

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
          folder={folder} // Use the folder from getCenterGalleryImageProps
          preset={preset} // Use the preset from getCenterGalleryImageProps
        />

        {loading ? (
          <div className={styles.loadingContainer}>Loading images...</div>
        ) : error ? (
          <div className={styles.errorContainer}>{error}</div>
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
                  draggable
                  onDragStart={(e) => handleDragStart(e, image, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`${styles.imageContainer} ${
                    isDragging && draggedImage?.id === image.id
                      ? styles.dragging
                      : ""
                  } ${dragOverIndex === index ? styles.dragOver : ""}`}
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
                      width={300}
                      height={300}
                      sizes="(max-width: 768px) 100vw, 300px"
                      className={styles.image}
                    />
                  </div>
                </div>
              ))
            ) : !isUploading ? (
              <div className={styles.emptyState}>No images found</div>
            ) : null}
          </div>
        )}

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
