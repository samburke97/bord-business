"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SearchInput from "@/components/ui/SearchInput";
import TextInput from "@/components/ui/TextInput";
import ImageUploader from "@/lib/actions/ImageUploader";
import EmptyState from "@/components/ui/EmptyState";
import Toast from "@/components/ui/Toast";
import styles from "./EditTagPage.module.css";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import SelectableDataTable from "@/components/ui/SelectableDataTable";
import { getTagImageProps } from "@/lib/cloudinary/upload-helpers";
import LoadingSpinner from "../ui/LoadingSpinner";

interface Group {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  imageUrl?: string;
  groups: Group[];
}

interface EditTagPageProps {
  tagId: string;
}

export default function EditTagPage({ tagId }: EditTagPageProps) {
  const router = useRouter();

  // Get the appropriate folder and preset for tag image uploads
  const { folder, preset } = getTagImageProps(tagId);

  const [tag, setTag] = useState<Tag | null>(null);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the tag data
  useEffect(() => {
    const fetchTag = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/tags/${tagId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch tag");
        }
        const data = await response.json();
        setTag(data);
        setName(data.name);
        setImageUrl(data.imageUrl || null);
        setSelectedGroups(data.groups || []);
      } catch (error) {
        console.error("Error fetching tag:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch tag"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (tagId) {
      fetchTag();
    }
  }, [tagId]);

  // Fetch available groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch("/api/groups");
        if (!response.ok) {
          throw new Error("Failed to fetch groups");
        }
        const data = await response.json();
        setAvailableGroups(data);
        setFilteredGroups(data);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };

    fetchGroups();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = availableGroups.filter((group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups(availableGroups);
    }
  }, [searchQuery, availableGroups]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);

    if (error) {
      setError(null);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddGroup = (group: Group) => {
    // Check if group is already selected
    if (
      !selectedGroups.some((selectedGroup) => selectedGroup.id === group.id)
    ) {
      setSelectedGroups([...selectedGroups, group]);
      setToast({ message: `${group.name} Added`, type: "success" });

      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast(null);
      }, 3000);
    }
  };

  const handleRemoveGroup = (groupId: string) => {
    setSelectedGroups(selectedGroups.filter((group) => group.id !== groupId));
  };

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
    setToast({ message: "Icon uploaded", type: "success" });

    // Hide toast after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleImageDelete = () => {
    setImageUrl(null);
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
        "Are you sure you want to delete this tag? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete tag");
      }

      setToast({ message: "Tag deleted successfully", type: "success" });

      // Navigate back to tags page after a short delay
      setTimeout(() => {
        router.push("/tags");
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
      setError("Tag name is required");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          imageUrl,
          groups: selectedGroups.map((group) => group.id),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update tag");
      }

      setToast({ message: "Tag updated successfully", type: "success" });

      setTimeout(() => {
        router.push("/tags");
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

  if (isLoading && !tag) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <ActionHeader
        primaryAction={handleSubmit}
        secondaryAction={() => router.back()}
        primaryLabel="Save"
        secondaryLabel="Cancel"
        isProcessing={isSubmitting}
        variant="edit"
        deleteAction={handleDelete}
      />
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <TitleDescription title={"Edit Tag"} />
          <div className={styles.formSection}>
            <div className={styles.inputGroup}>
              <label htmlFor="tagIcon" className={styles.label}>
                Tag Icon & Name
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
                    alt="Tag icon"
                    showDeleteButton={true}
                    onImageDelete={handleImageDelete}
                  />
                </div>
                <div className={styles.inputContainer}>
                  <TextInput
                    id="tagName"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Enter tag name"
                    disabled={isSubmitting}
                    error={error}
                    maxLength={50}
                    showCharCount={true}
                  />
                </div>
              </div>
            </div>

            <div className={styles.groupsSection}>
              <h2 className={styles.label}>Group List</h2>
              <div className={styles.searchContainer}>
                <SearchInput
                  onSearch={handleSearch}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onClear={() => handleSearch("")}
                  placeholder="Search Groups"
                />
              </div>

              {filteredGroups.length === 0 && !isLoading ? (
                <EmptyState
                  message="No groups found."
                  createNewLink="/groups/create"
                  createNewLabel="Create Group"
                />
              ) : (
                <SelectableDataTable
                  items={filteredGroups}
                  selected={selectedGroups}
                  onAdd={handleAddGroup}
                  onRemove={handleRemoveGroup}
                  isLoading={isLoading}
                  itemType="group"
                  nameColumnConfig={{ header: "Group Name", align: "left" }}
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
