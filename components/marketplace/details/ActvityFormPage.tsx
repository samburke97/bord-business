"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TextInput from "@/components/ui/TextInput";
import TextArea from "@/components/ui/TextArea";
import SearchDropDown from "@/components/ui/SearchDropDown";
import ImageUploader from "@/lib/actions/ImageUploader";
import Toast from "@/components/ui/Toast";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import PricingComponent from "./PricingComponent";
import styles from "./ActivityFormPage.module.css";
// Import the helper function for activity image uploads
import { getActivityImageProps } from "@/lib/cloudinary/upload-helpers";

// Types
interface Tag {
  id: string;
  name: string;
  imageUrl?: string;
}

interface PricingVariant {
  id: string;
  playerType: string;
  duration: string;
  priceType: string;
  price: number;
}

// Group names for fetching tags
const GROUP_NAMES = {
  ACTIVITIES: "Activities",
};

interface ActivityFormPageProps {
  locationId: string;
  activityId?: string;
}

export default function ActivityFormPage({
  locationId,
  activityId,
}: ActivityFormPageProps) {
  const isEditMode = !!activityId;
  const router = useRouter();

  // Get the appropriate folder and preset for activity image uploads
  const { folder, preset } = getActivityImageProps(locationId);

  // Reference to track if component is mounted
  const isMounted = useRef(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [activityTypeName, setActivityTypeName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [buttonTitle, setButtonTitle] = useState("");
  const [buttonLink, setButtonLink] = useState("");
  const [pricingVariants, setPricingVariants] = useState<PricingVariant[]>([]);

  // Tag options
  const [activityTypes, setActivityTypes] = useState<Tag[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Reset all state when activityId changes
  useEffect(() => {
    // Reset form state
    setTitle("");
    setDescription("");
    setActivityTypeId("");
    setActivityTypeName("");
    setImageUrl(null);
    setButtonTitle("");
    setButtonLink("");
    setPricingVariants([]);
    setErrors({});
    setIsLoading(true);
  }, [activityId]);

  // Create a default pricing variant
  const createDefaultPricingVariant = useCallback((): PricingVariant => {
    return {
      id: `new-${Date.now()}`,
      playerType: "",
      duration: "Not Specified",
      priceType: "",
      price: 0,
    };
  }, []);

  // Cleanup effect to prevent state updates after unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch activity types
  useEffect(() => {
    const fetchActivityTypes = async () => {
      try {
        const response = await fetch(
          `/api/groups/byName/${encodeURIComponent(
            GROUP_NAMES.ACTIVITIES
          )}/tags`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch activity types: ${response.status}`);
        }

        const activityTypesData = await response.json();

        if (isMounted.current) {
          setActivityTypes(activityTypesData);
        }
      } catch (error) {
        console.error("Error fetching activity types:", error);
      }
    };

    fetchActivityTypes();
  }, []);

  // Fetch activity data or initialize with defaults
  useEffect(() => {
    // Initialize with a default pricing variant if not in edit mode
    if (!isEditMode) {
      setPricingVariants([createDefaultPricingVariant()]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchActivity = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/activities/${activityId}`, {
          signal, // Use abort controller signal
          cache: "no-store", // Prevent caching
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch activity: ${response.status}`);
        }

        const data = await response.json();

        // Only update state if component is still mounted
        if (!isMounted.current) {
          return;
        }

        // Set basic form fields
        setTitle(data.title || "");
        setDescription(data.description || "");
        setActivityTypeId(data.activityTypeId || "");
        if (data.activityType) {
          setActivityTypeName(data.activityType.name || "");
        }
        setImageUrl(data.imageUrl || null);
        setButtonTitle(data.buttonTitle || "");
        setButtonLink(data.buttonLink || "");

        // Handle pricing variants
        if (
          data.pricingVariants &&
          Array.isArray(data.pricingVariants) &&
          data.pricingVariants.length > 0
        ) {
          // Map the data to our expected format
          const formattedVariants = data.pricingVariants.map(
            (variant: any) => ({
              id:
                variant.id ||
                `existing-${Date.now()}-${Math.random()
                  .toString(36)
                  .substring(2, 9)}`,
              playerType: variant.playerType || "",
              duration: variant.duration || "Not Specified",
              priceType: variant.priceType || "",
              price:
                typeof variant.price === "number"
                  ? variant.price
                  : parseFloat(variant.price) || 0,
            })
          );

          setPricingVariants(formattedVariants);
        } else {
          setPricingVariants([createDefaultPricingVariant()]);
        }
      } catch (error) {
        // Check if this is an abort error (which we don't want to handle as an error)
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error fetching activity:", error);
        showToast(
          error instanceof Error ? error.message : "Failed to fetch activity",
          "error"
        );

        // Initialize with default if fetching fails
        setPricingVariants([createDefaultPricingVariant()]);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    fetchActivity();

    // Cleanup: abort any in-flight requests if component unmounts or dependencies change
    return () => {
      controller.abort();
    };
  }, [activityId, isEditMode, createDefaultPricingVariant]);

  // Update activity type name if we have an ID
  useEffect(() => {
    if (activityTypeId && activityTypes.length > 0) {
      const type = activityTypes.find((t) => t.id === activityTypeId);
      if (type && isMounted.current) setActivityTypeName(type.name);
    }
  }, [activityTypeId, activityTypes]);

  // Helper to show toast messages
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      if (isMounted.current) {
        setToast(null);
      }
    }, 3000);
  };

  // Form validation
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Activity title is required";
    } else if (title.length > 20) {
      newErrors.title = "Title must be 20 characters or less";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.length > 500) {
      newErrors.description = "Description must be 500 characters or less";
    }

    if (!activityTypeId) {
      newErrors.activityType = "Activity type is required";
    }

    if (!imageUrl) {
      newErrors.image = "Image is required";
    }

    if (buttonTitle && buttonTitle.length > 30) {
      newErrors.buttonTitle = "Button title must be 30 characters or less";
    }

    // Validate pricing variants
    pricingVariants.forEach((variant, index) => {
      if (!variant.playerType) {
        newErrors[`pricing_${index}_playerType`] = "Player type is required";
      }

      // Duration is not required

      if (!variant.priceType) {
        newErrors[`pricing_${index}_priceType`] = "Price type is required";
      }

      // Validate price if not free
      if (
        variant.priceType !== "Free" &&
        (isNaN(variant.price) || variant.price <= 0)
      ) {
        newErrors[`pricing_${index}_price`] = "Valid price is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Event handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (errors.title) {
      setErrors({ ...errors, title: "" });
    }
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setDescription(e.target.value);
    if (errors.description) {
      setErrors({ ...errors, description: "" });
    }
  };

  const handleButtonTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setButtonTitle(e.target.value);
    if (errors.buttonTitle) {
      setErrors({ ...errors, buttonTitle: "" });
    }
  };

  const handleButtonLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setButtonLink(e.target.value);
  };

  const handleActivityTypeChange = (value: string) => {
    setActivityTypeId(value);
    const type = activityTypes.find((t) => t.id === value);
    if (type) {
      setActivityTypeName(type.name);
    }

    if (errors.activityType) {
      setErrors({ ...errors, activityType: "" });
    }
  };

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
    if (errors.image) {
      setErrors({ ...errors, image: "" });
    }
    showToast("Image uploaded", "success");
  };

  const handleUploadError = (message: string) => {
    showToast(message, "error");
  };

  const handleDelete = async () => {
    if (!isEditMode) return;

    if (
      !confirm(
        "Are you sure you want to delete this activity? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete activity");
      }

      showToast("Activity deleted successfully", "success");

      // Navigate back after a short delay
      setTimeout(() => {
        router.push(`/locations/edit/${locationId}/activities`);
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, "error");
      } else {
        showToast("An unexpected error occurred", "error");
      }
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for submission
      const activityData = {
        title,
        description,
        activityTypeId,
        imageUrl,
        buttonTitle: buttonTitle || null,
        buttonLink: buttonLink || null,
        locationId,
        pricingVariants: pricingVariants.map((variant) => ({
          id: variant.id.startsWith("new-") ? undefined : variant.id,
          playerType: variant.playerType,
          duration: variant.duration,
          priceType: variant.priceType,
          price: variant.price,
        })),
      };

      const url = isEditMode
        ? `/api/activities/${activityId}`
        : `/api/activities`;
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });

      if (response.status === 409) {
        const data = await response.json();
        showToast(
          data.error || "An activity with this title already exists",
          "error"
        );
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || `Failed to ${isEditMode ? "update" : "create"} activity`
        );
      }

      showToast(
        `Activity ${isEditMode ? "updated" : "created"} successfully`,
        "success"
      );

      // Navigate back after a short delay
      setTimeout(() => {
        router.push(`/locations/edit/${locationId}/activities`);
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, "error");
      } else {
        showToast("An unexpected error occurred", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.loadingState}>Loading data...</div>
        </div>
      </div>
    );
  }

  // Render component sections
  const renderDetailsSection = () => (
    <div className={styles.formSection}>
      <h2 className={styles.sectionTitle}>Details</h2>

      <div className={styles.formGroup}>
        <TextInput
          label="Activity Title"
          id="activityTitle"
          value={title}
          onChange={handleTitleChange}
          placeholder={
            isEditMode ? "Edit Activity Title" : "Add Activity Title"
          }
          disabled={isSubmitting}
          error={errors.title}
          maxLength={20}
          showCharCount={true}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <SearchDropDown
          key="activity-type-dropdown"
          label="Activity Type"
          value={activityTypeName}
          onChange={handleActivityTypeChange}
          placeholder={
            isEditMode ? "Edit Activity Type" : "Select Activity Type"
          }
          options={activityTypes.map((type) => ({
            value: type.id,
            label: type.name,
          }))}
          required
          error={errors.activityType}
        />
      </div>

      <div className={styles.formGroup}>
        <TextArea
          label="Description"
          id="description"
          value={description}
          onChange={handleDescriptionChange}
          placeholder={
            isEditMode
              ? "Edit Activity Description"
              : "Enter Activity Description"
          }
          disabled={isSubmitting}
          error={errors.description}
          maxLength={500}
          showCharCount={true}
          rows={5}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <ImageUploader
          label="Image"
          imageUrl={imageUrl}
          onImageUpload={handleImageUpload}
          onImageDelete={() => {
            setImageUrl(null);
            if (errors.image) {
              setErrors({ ...errors, image: "" });
            }
          }}
          onError={handleUploadError}
          folder={folder}
          preset={preset}
          size="xl"
          alt="Activity image"
          className={styles.imageUploader}
          error={errors.image}
          showDeleteButton={true}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <TextInput
          label="Button Title"
          id="buttonTitle"
          value={buttonTitle}
          onChange={handleButtonTitleChange}
          placeholder="Enter call to action"
          disabled={isSubmitting}
          error={errors.buttonTitle}
          maxLength={30}
          showCharCount={true}
        />
      </div>

      <div className={styles.formGroup}>
        <TextInput
          label="Button Link"
          id="buttonLink"
          value={buttonLink}
          onChange={handleButtonLinkChange}
          placeholder="Paste action link"
          disabled={isSubmitting}
        />
      </div>
    </div>
  );

  return (
    <>
      <ActionHeader
        primaryAction={handleSubmit}
        secondaryAction={() => router.back()}
        primaryLabel={isEditMode ? "Save" : "Create"}
        secondaryLabel="Cancel"
        isProcessing={isSubmitting}
        processingLabel={isEditMode ? "Saving..." : "Creating..."}
        variant={isEditMode ? "edit" : "create"}
        deleteAction={isEditMode ? handleDelete : undefined}
        backIcon={
          <Image
            src="/icons/utility-outline/cross.svg"
            width={20}
            height={20}
            alt="Close"
            priority={true}
          />
        }
      />
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <TitleDescription
            title={isEditMode ? "Edit Activity" : "Create Activity"}
          />
          {renderDetailsSection()}

          <PricingComponent
            pricingVariants={pricingVariants}
            setPricingVariants={setPricingVariants}
            errors={errors}
            isSubmitting={isSubmitting}
          />
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </>
  );
}
