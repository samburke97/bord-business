"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TextInput from "@/components/ui/TextInput";
import SearchInput from "@/components/ui/SearchInput";
import SelectableDataTable from "@/components/ui/SelectableDataTable";
import EmptyState from "@/components/ui/EmptyState";
import ImageUploader from "@/lib/actions/ImageUploader";
import Toast from "@/components/ui/Toast";
import styles from "./EditSportPage.module.css";
import TitleDescription from "@/components/ui/TitleDescription";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import { getSportImageProps } from "@/lib/cloudinary/upload-helpers";
import LoadingSpinner from "../ui/LoadingSpinner";

interface Tag {
  id: string;
  name: string;
  imageUrl?: string;
}

interface Sport {
  id: string;
  name: string;
  imageUrl?: string;
  tags: Tag[];
  centerCount: number;
}

interface EditSportPageProps {
  sportId: string;
}

export default function EditSportPage({ sportId }: EditSportPageProps) {
  const router = useRouter();

  // Get the appropriate folder and preset for sport image uploads
  const { folder, preset } = getSportImageProps(sportId);

  const [sport, setSport] = useState<Sport | null>(null);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the sport data
  useEffect(() => {
    const fetchSport = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/sports/${sportId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch sport");
        }
        const data = await response.json();
        setSport(data);
        setName(data.name);
        setImageUrl(data.imageUrl || null);
        setSelectedTags(data.tags || []);
      } catch (error) {
        console.error("Error fetching sport:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch sport"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (sportId) {
      fetchSport();
    }
  }, [sportId]);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch("/api/tags");
        if (!response.ok) {
          throw new Error("Failed to fetch tags");
        }
        const data = await response.json();
        setAvailableTags(data);
        setFilteredTags(data);
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    fetchTags();
  }, []);

  // Filter tags based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = availableTags.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(availableTags);
    }
  }, [searchQuery, availableTags]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);

    // Clear error when user starts typing again after seeing an error
    if (error) {
      setError(null);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddTag = async (tag: Tag) => {
    // Check if tag is already selected
    if (!selectedTags.some((selectedTag) => selectedTag.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
      setToast({ message: `${tag.name} Added`, type: "success" });

      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast(null);
      }, 3000);
    }

    return Promise.resolve();
  };

  const handleRemoveTag = async (tagId: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag.id !== tagId));
    return Promise.resolve();
  };

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
    setToast({ message: "Icon uploaded", type: "success" });

    // Hide toast after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleUploadError = (message: string) => {
    setError(message);
    setToast({ message, type: "error" });

    // Hide toast after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this sport? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/sports/${sportId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete sport");
      }

      setToast({ message: "Sport deleted successfully", type: "success" });

      // Navigate back to sports page after a short delay
      setTimeout(() => {
        router.push("/sports");
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    if (!name.trim()) {
      setError("Sport name is required");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/sports/${sportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          imageUrl,
          tags: selectedTags.map((tag) => tag.id),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update sport");
      }

      setToast({ message: "Sport updated successfully", type: "success" });

      // Navigate back to sports page after a short delay
      setTimeout(() => {
        router.push("/sports");
      }, 1500);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageDelete = () => {
    setImageUrl(null);
  };

  if (isLoading && !sport) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <ActionHeader
        primaryAction={handleSubmit}
        secondaryAction={() => router.back()}
        primaryLabel="Save"
        isProcessing={isSubmitting}
        processingLabel="Saving..."
        variant="edit"
        deleteAction={handleDelete}
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
          <TitleDescription title={sport?.name || "Edit Sport"} />
          <div className={styles.formSection}>
            <div className={styles.inputGroup}>
              <label htmlFor="sportIcon" className={styles.label}>
                Sport Icon & Name
              </label>
              <div className={styles.iconNameContainer}>
                <div className={styles.iconContainer}>
                  <ImageUploader
                    imageUrl={imageUrl}
                    onImageUpload={handleImageUpload}
                    onError={handleUploadError}
                    folder={folder}
                    preset={preset}
                    size="lg"
                    alt="Sport icon"
                    showDeleteButton={true}
                    onImageDelete={handleImageDelete}
                  />
                </div>

                <TextInput
                  id="sportName"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Enter sport name"
                  disabled={isSubmitting}
                  error={error}
                  maxLength={50}
                  showCharCount={true}
                />
              </div>
            </div>

            <div className={styles.tagsSection}>
              <h2 className={styles.label}>Tag List</h2>
              <div className={styles.searchContainer}>
                <SearchInput
                  onSearch={handleSearch}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onClear={() => handleSearch("")}
                  placeholder="Search Tags"
                />
              </div>

              {filteredTags.length === 0 && !isLoading ? (
                <EmptyState
                  message="No tags found."
                  createNewLink="/tags/create"
                  createNewLabel="Create Tag"
                />
              ) : (
                <SelectableDataTable
                  items={filteredTags}
                  selected={selectedTags}
                  onAdd={handleAddTag}
                  onRemove={handleRemoveTag}
                  isLoading={isLoading}
                  itemType="tag"
                  nameColumnConfig={{ header: "Tag Name", align: "left" }}
                />
              )}
            </div>
          </div>

          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      </div>
    </>
  );
}
