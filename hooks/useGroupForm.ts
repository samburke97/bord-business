import { useState, useEffect } from "react";

export interface Tag {
  id: string;
  name: string;
  icon?: string;
}

export interface GroupFormProps {
  groupId?: string;
  onSubmitSuccess?: () => void;
}

export function useGroupForm({
  groupId,
  onSubmitSuccess,
}: GroupFormProps = {}) {
  const [name, setName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine if we're in edit mode
  const isEditMode = !!groupId;

  // Fetch the group data if in edit mode
  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/groups/${groupId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch group");
        }
        const data = await response.json();
        setName(data.name);
        setSelectedTags(data.tags || []);
      } catch (error) {
        console.error("Error fetching group:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch group"
        );
      }
    };

    if (isEditMode) {
      fetchGroup();
    }
  }, [groupId, isEditMode]);

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
    // Limit to 50 characters
    if (e.target.value.length <= 50) {
      setName(e.target.value);

      // Clear error when user starts typing again after seeing an error
      if (error) {
        setError(null);
      }
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
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

  const handleCreateTag = (newTag: Tag) => {
    setAvailableTags([...availableTags, newTag]);
    setSelectedTags([...selectedTags, newTag]);
    setIsTagModalOpen(false);
    setToast({ message: `${newTag.name} Created & Added`, type: "success" });

    // Hide toast after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!name.trim()) {
      setError("Group name is required");
      setIsSubmitting(false);
      return;
    }

    try {
      // Different endpoints and methods for create vs edit
      const url = isEditMode ? `/api/groups/${groupId}` : "/api/groups";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          tags: selectedTags.map((tag) => tag.id),
        }),
      });

      // Handle various HTTP status codes
      if (response.status === 409) {
        const data = await response.json();
        setError(data.error || "A group with this name already exists");
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || `Failed to ${isEditMode ? "update" : "create"} group`
        );
      }

      const successMessage = isEditMode
        ? "Group updated successfully"
        : "Group created successfully";
      setToast({ message: successMessage, type: "success" });

      // Navigate back to groups page after a short delay
      setTimeout(() => {
        if (onSubmitSuccess) {
          onSubmitSuccess();
        } else {
          window.location.href = "/groups";
        }
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

  return {
    // State
    name,
    searchQuery,
    selectedTags,
    availableTags,
    filteredTags,
    isSubmitting,
    isTagModalOpen,
    error,
    toast,
    isLoading,
    isEditMode,

    // Handlers
    setName,
    setSearchQuery,
    setSelectedTags,
    setAvailableTags,
    setFilteredTags,
    setIsSubmitting,
    setIsTagModalOpen,
    setError,
    setToast,
    setIsLoading,

    // Methods
    handleNameChange,
    handleSearch,
    handleAddTag,
    handleRemoveTag,
    handleCreateTag,
    handleSubmit,
  };
}
