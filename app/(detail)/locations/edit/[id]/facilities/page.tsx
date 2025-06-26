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

export default function FacilitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const locationId = resolvedParams.id;

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<Facility[]>([]);
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>(
    []
  );
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch facility tags from the Facilities group
        const tagsResponse = await fetch(
          `/api/locations/${locationId}/facilities`
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
        console.error("Error fetching data:", error);
        setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [locationId]);

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
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/locations/${locationId}/facilities`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          facilities: selectedFacilities.map((facility) => facility.id),
        }),
      });

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
    router.back();
  };

  return (
    <>
      <ActionHeader
        primaryAction={handleSave}
        secondaryAction={handleCancel}
        primaryLabel="Save"
        secondaryLabel="Close"
        variant="edit"
      />
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
              isLoading={isLoading}
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
