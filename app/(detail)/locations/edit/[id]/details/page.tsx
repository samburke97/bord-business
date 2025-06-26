"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Toast from "@/components/ui/Toast";
import TextInput from "@/components/ui/TextInput";
import SearchDropDown from "@/components/ui/SearchDropDown";
import SearchInput from "@/components/ui/SearchInput";
import SelectableDataTable from "@/components/ui/SelectableDataTable";
import styles from "./page.module.css";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface LocationDetailsData {
  id: string;
  name: string;
  establishmentId?: string | null;
  establishment?: string | null;
  sports?: Array<{
    id: string;
    name: string;
    imageUrl?: string | null;
  }>;
}

interface Category {
  id: string;
  name: string;
}

interface Sport {
  id: string;
  name: string;
  imageUrl?: string | null;
}

type SportItem = {
  id: string;
  name: string;
  imageUrl?: string;
  originalSport: Sport;
};

export default function EditLocationDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [locationData, setLocationData] = useState<LocationDetailsData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state and validation
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [sports, setSports] = useState<Sport[]>([]);
  const [filteredSports, setFilteredSports] = useState<Sport[]>([]);
  const [selectedSports, setSelectedSports] = useState<Sport[]>([]);
  const [sportSearchQuery, setSportSearchQuery] = useState("");

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  // Adapted sports data for SelectableDataTable
  const adaptedFilteredSports = useMemo(
    () =>
      filteredSports.map((sport) => ({
        id: sport.id,
        name: sport.name,
        imageUrl: sport.imageUrl || undefined, // Convert null to undefined
        originalSport: sport,
      })),
    [filteredSports]
  );

  const adaptedSelectedSports = useMemo(
    () =>
      selectedSports.map((sport) => ({
        id: sport.id,
        name: sport.name,
        imageUrl: sport.imageUrl || undefined, // Convert null to undefined
        originalSport: sport,
      })),
    [selectedSports]
  );

  // Fetch existing location data and categories/sports
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setNameError(null);

        // Fetch location data
        const locationResponse = await fetch(`/api/locations/${id}`);
        if (!locationResponse.ok) {
          throw new Error("Failed to fetch location data");
        }
        const locationData = await locationResponse.json();

        // Set form state from location data
        setName(locationData.name || "");
        setSelectedCategoryId(locationData.establishmentId || "");
        setSelectedSports(locationData.sports || []);
        setLocationData(locationData);

        // Fetch categories
        const categoriesResponse = await fetch("/api/groups/categories");
        if (!categoriesResponse.ok) {
          throw new Error("Failed to fetch categories");
        }
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        // Use the correct sports API endpoint
        const sportsResponse = await fetch("/api/sports");
        if (!sportsResponse.ok) {
          throw new Error("Failed to fetch sports");
        }
        const sportsData = await sportsResponse.json();
        setSports(sportsData);
        setFilteredSports(sportsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Filter sports based on search query
  useEffect(() => {
    if (sportSearchQuery) {
      const filtered = sports.filter((sport) =>
        sport.name.toLowerCase().includes(sportSearchQuery.toLowerCase())
      );
      setFilteredSports(filtered);
    } else {
      setFilteredSports(sports);
    }
  }, [sportSearchQuery, sports]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    // Clear validation error when user types
    if (nameError) {
      setNameError(null);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const handleSportSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSportSearchQuery(e.target.value);
  };

  const handleAddSport = async (sportItem: SportItem) => {
    if (!selectedSports.some((s) => s.id === sportItem.id)) {
      setSelectedSports([...selectedSports, sportItem.originalSport]);

      // Show toast when a sport is added
      setToast({
        visible: true,
        message: `${sportItem.name} added successfully`,
        type: "success",
      });

      setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
    }
    return Promise.resolve();
  };

  const handleRemoveSport = async (sportId: string) => {
    const sportToRemove = selectedSports.find((sport) => sport.id === sportId);
    if (sportToRemove) {
      setSelectedSports(selectedSports.filter((sport) => sport.id !== sportId));

      // Show toast when a sport is removed
      setToast({
        visible: true,
        message: `${sportToRemove.name} removed`,
        type: "success",
      });

      setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
    }
    return Promise.resolve();
  };

  const handleClose = () => {
    router.push(`/locations/${id}`);
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate name
    if (!name.trim()) {
      setNameError("Location name is required");
      isValid = false;
    }

    return isValid;
  };

  const handleSave = async () => {
    // Validate form first
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        name,
        establishmentId: selectedCategoryId || null,
        sportsIds: selectedSports.map((sport) => sport.id), // These are Sport IDs
      };

      const response = await fetch(`/api/locations/${id}/details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Extract the actual error message from the API if available
        const errorMessage =
          responseData.error || "Failed to update location details";
        console.error("API error details:", errorMessage);
        throw new Error(errorMessage);
      }

      // Show success toast
      setToast({
        visible: true,
        message: "Location details updated successfully",
        type: "success",
      });

      // Navigate back after a short delay
      setTimeout(() => {
        router.push(`/locations/${id}`);
      }, 1500);
    } catch (error) {
      console.error("Error updating location details:", error);

      // Show error toast
      setToast({
        visible: true,
        message:
          (error as Error).message || "Failed to update location details",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Close the toast notification
  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Convert categories to options format for SearchDropDown
  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !locationData) {
    return (
      <div className={styles.errorContainer}>
        <p>Error loading location details: {error || "Unknown error"}</p>
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
        variant="edit"
      />
      <div className={styles.container}>
        <TitleDescription
          title="Details"
          description="Please add the location name, the location category, and its associated sports."
        />

        <div className={styles.formField}>
          <TextInput
            id="locationName"
            label="Name"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter location name"
            required
            error={nameError}
          />
        </div>

        <div className={styles.formField}>
          <SearchDropDown
            label="Category"
            value={selectedCategoryId}
            onChange={handleCategoryChange}
            options={categoryOptions}
            placeholder="Select Category"
          />
        </div>

        <div className={styles.formField}>
          <SearchInput
            label="Search Sports"
            placeholder="Search Sports"
            value={sportSearchQuery}
            onChange={handleSportSearch}
            onClear={() => setSportSearchQuery("")}
          />

          <div className={styles.sportOptions}>
            <SelectableDataTable
              items={adaptedFilteredSports}
              selected={adaptedSelectedSports}
              onAdd={handleAddSport}
              onRemove={handleRemoveSport}
              emptyMessage="No sports found."
              nameColumnConfig={{ header: "Sport Name", align: "left" }}
              itemType="sport"
              itemsPerPage={8}
            />
          </div>
        </div>

        {toast.visible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={handleCloseToast}
          />
        )}
      </div>
    </>
  );
}
