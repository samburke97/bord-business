"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import SearchInput from "@/components/ui/SearchInput";
import Toast from "@/components/ui/Toast";
import SelectableDataTable from "@/components/ui/SelectableDataTable";
import styles from "./page.module.css";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";

interface Facility {
  id: string;
  name: string;
  imageUrl?: string | null;
  isSelected?: boolean;
}

interface FacilityTag extends Facility {
  isSelected?: boolean;
}

interface FacilitiesPageProps {
  centerId?: string;
  formData?: any; // TODO: Define proper facilities form data type
  onContinue?: (data: any) => void;
  // Legacy props for standalone edit mode
  params?: Promise<{ id: string }>;
}

export default function FacilitiesPage({
  centerId,
  formData: initialFormData,
  onContinue,
  params,
}: FacilitiesPageProps) {
  // Determine if we're in setup mode (parent manages data) or standalone edit mode
  const isSetupMode = !!centerId && !!onContinue;

  // For standalone mode, we need to get ID from params
  const [standaloneId, setStandaloneId] = useState<string | null>(null);
  const locationId = isSetupMode ? centerId : standaloneId;

  const router = useRouter();

  // Initialize standalone mode ID
  useEffect(() => {
    if (!isSetupMode && params) {
      const getId = async () => {
        const resolvedParams = await params;
        setStandaloneId(resolvedParams.id);
      };
      getId();
    }
  }, [params, isSetupMode]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<Facility[]>([]);
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>(
    []
  );
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!isSetupMode); // Don't show loading in setup mode initially
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing data in setup mode to prefill form
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!locationId || !isSetupMode) return;

      try {
        setIsLoadingData(true);
        setError(null);

        // Fetch facility tags from the Facilities group
        const tagsResponse = await fetch(
          `/api/marketplace/${locationId}/facilities`
        );

        if (tagsResponse.ok) {
          const tagsData: FacilityTag[] = await tagsResponse.json();
          setAvailableFacilities(tagsData);
          setFilteredFacilities(tagsData);

          // Pre-select existing facilities
          const selectedFacilitiesList = tagsData.filter(
            (tag) => tag.isSelected
          );
          setSelectedFacilities(
            selectedFacilitiesList.map(
              ({ isSelected, ...rest }) => rest as Facility
            )
          );
        }
      } catch (error) {
        // Continue with empty form on error
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchExistingData();
  }, [locationId, isSetupMode]);

  // Fetch data for standalone mode
  useEffect(() => {
    const fetchData = async () => {
      if (!locationId || isSetupMode) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch facility tags from the Facilities group
        const tagsResponse = await fetch(
          `/api/marketplace/${locationId}/facilities`
        );

        if (!tagsResponse.ok) {
          throw new Error("Failed to fetch facility tags");
        }

        const tagsData: FacilityTag[] = await tagsResponse.json();
        setAvailableFacilities(tagsData);
        setFilteredFacilities(tagsData);

        // Pre-select existing facilities
        const selectedFacilitiesList = tagsData.filter((tag) => tag.isSelected);
        setSelectedFacilities(
          selectedFacilitiesList.map(
            ({ isSelected, ...rest }) => rest as Facility
          )
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (locationId && !isSetupMode) {
      fetchData();
    }
  }, [locationId, isSetupMode]);

  // Handle continue for setup mode
  const handleContinue = () => {
    if (isSetupMode && onContinue) {
      onContinue({ facilities: selectedFacilities });
    }
  };

  // Expose handleContinue to window for header button
  useEffect(() => {
    if (isSetupMode) {
      // @ts-ignore
      window.handleStepContinue = handleContinue;

      return () => {
        // @ts-ignore
        delete window.handleStepContinue;
      };
    }
  }, [selectedFacilities, isSetupMode]);

  // Filter facilities based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = availableFacilities.filter((facility) =>
        facility.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFacilities(filtered);
    } else {
      setFilteredFacilities(availableFacilities);
    }
  }, [searchQuery, availableFacilities]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleAddFacility = async (facility: Facility) => {
    if (
      !selectedFacilities.some(
        (selectedFacility) => selectedFacility.id === facility.id
      )
    ) {
      setSelectedFacilities([...selectedFacilities, facility]);
      setToast({ message: `${facility.name} Added`, type: "success" });

      setTimeout(() => {
        setToast(null);
      }, 3000);
    }
  };

  const handleRemoveFacility = async (facilityId: string) => {
    setSelectedFacilities(
      selectedFacilities.filter((facility) => facility.id !== facilityId)
    );
  };

  const handleSave = async () => {
    if (!locationId || isSubmitting || isSetupMode) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(
        `/api/marketplace/${locationId}/facilities`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            facilities: selectedFacilities.map((facility) => facility.id),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update facilities");
      }

      setToast({ message: "Facilities updated successfully", type: "success" });

      // Navigate back to location detail page after a short delay
      setTimeout(() => {
        router.push(`/locations/${locationId}`);
      }, 1500);
    } catch (error) {
      console.error("Error saving facilities:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      setToast({ message: "Failed to update facilities", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSetupMode) {
      router.back();
    }
  };

  // Don't render until we have an ID
  if (!locationId) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching existing data in setup mode
  if (isSetupMode && isLoadingData) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading existing data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Only show ActionHeader in standalone edit mode */}
      {!isSetupMode && (
        <ActionHeader
          primaryAction={handleSave}
          secondaryAction={handleCancel}
          primaryLabel="Save"
          secondaryLabel="Close"
          variant="edit"
        />
      )}

      <div className={styles.container}>
        <TitleDescription
          title="Facilities"
          description="Please add all your business's facilities."
        />

        <div className={styles.facilitiesSection}>
          <div className={styles.searchContainer}>
            <SearchInput
              id="facility-search"
              label="Search Facilities"
              value={searchQuery}
              placeholder="Search facilities"
              onChange={(e) => handleSearch(e.target.value)}
              onClear={() => handleSearch("")}
            />
          </div>

          <div className={styles.facilitiesTable}>
            <SelectableDataTable
              items={filteredFacilities}
              selected={selectedFacilities}
              onAdd={handleAddFacility}
              onRemove={handleRemoveFacility}
              isLoading={isLoading || isLoadingData}
              emptyMessage={
                <div className={styles.emptyState}>
                  No facilities found. Add facility tags to the Facilities
                  group.
                </div>
              }
              itemType="tag"
            />
          </div>
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>
    </>
  );
}
