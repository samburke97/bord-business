"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SearchInput from "@/components/ui/SearchInput";
import TextInput from "@/components/ui/TextInput";
import ImageUploader from "@/lib/actions/ImageUploader";
import EmptyState from "@/components/ui/EmptyState";
import Toast from "@/components/ui/Toast";
import styles from "./CreateSportPage.module.css";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import SelectableDataTable from "@/components/ui/SelectableDataTable";
import { getSportImageProps } from "@/lib/cloudinary/upload-helpers";

interface Tag {
  id: string;
  name: string;
  imageUrl?: string;
}

export default function CreateSportPage() {
  const router = useRouter();

  const { folder, preset } = getSportImageProps("new");

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

  // Fetch available tags on mount
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
      } finally {
        setIsLoading(false);
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

  const handleImageDelete = () => {
    setImageUrl(null);
  };

  const handleAddTag = (tag: Tag) => {
    // Check if tag is already selected
    if (!selectedTags.some((selectedTag) => selectedTag.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
      setToast({ message: `${tag.name} Added`, type: "success" });

      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast(null);
      }, 3000);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag.id !== tagId));
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
    setToast({ message: message, type: "error" });

    // Hide toast after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
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
      const response = await fetch("/api/sports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          imageUrl,
          tags: selectedTags.map((tag) => tag.id),
        }),
      });

      // Handle various HTTP status codes
      if (response.status === 409) {
        const data = await response.json();
        setError(data.error || "A sport with this name already exists");
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create sport");
      }

      setToast({ message: "Sport created successfully", type: "success" });

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

  return (
    <>
      <ActionHeader
        primaryAction={handleSubmit}
        secondaryAction={() => router.back()}
        primaryLabel="Create"
        secondaryLabel="Cancel"
        isProcessing={isSubmitting}
      />
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <TitleDescription title={"Create Sport"} />
          <div className={styles.formSection}>
            <div className={styles.inputGroup}>
              <label htmlFor="sportIcon" className={styles.label}>
                Sport Icon & Name
              </label>
              <div className={styles.iconNameWrapper}>
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
                <div className={styles.inputContainer}>
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
