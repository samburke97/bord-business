// components/locations/BusinessCategoryStep.tsx - FIXED: Dynamic Categories from Admin
"use client";

import { useState, useEffect } from "react";
import SearchDropDown from "@/components/ui/SearchDropDown";
import SearchInput from "@/components/ui/SearchInput";
import SelectableDataTable from "@/components/ui/SelectableDataTable";
import TitleDescription from "@/components/ui/TitleDescription";
import EmptyState from "@/components/ui/EmptyState";
import styles from "./BusinessCategoryStep.module.css";

interface BusinessCategoryStepProps {
  formData: {
    businessCategory: string;
    associatedSports: any[];
  };
  onContinue: (data: any) => void;
  onBack: () => void;
}

interface Sport {
  id: string;
  name: string;
  imageUrl?: string;
  status?: string;
}

interface Category {
  id: string;
  name: string;
  imageUrl?: string;
}

export default function BusinessCategoryStep({
  formData,
  onContinue,
  onBack,
}: BusinessCategoryStepProps) {
  const [businessCategory, setBusinessCategory] = useState(
    formData.businessCategory || ""
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSports, setSelectedSports] = useState<Sport[]>(
    formData.associatedSports || []
  );
  const [availableSports, setAvailableSports] = useState<Sport[]>([]);
  const [filteredSports, setFilteredSports] = useState<Sport[]>([]);
  const [sportsSearchQuery, setSportsSearchQuery] = useState("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSports, setIsLoadingSports] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  // Load categories from admin-defined categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);

        const response = await fetch("/api/groups/categories", {
          credentials: "include",
        });

        if (response.ok) {
          const categoriesData = await response.json();

          setCategories(categoriesData);
        } else {
          // Fallback to empty array - let user know categories couldn't load
          setCategories([]);
        }
      } catch (error) {
        console.error("❌ BusinessCategory: Error loading categories:", error);
        // Fallback to empty array
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Load available sports
  useEffect(() => {
    const loadSports = async () => {
      try {
        setIsLoadingSports(true);

        const response = await fetch("/api/sports", {
          credentials: "include",
        });

        if (response.ok) {
          const sports = await response.json();
          setAvailableSports(sports);
          setFilteredSports(sports);
        } else {
          // Fallback to default sports
          const defaultSports = [
            { id: "1", name: "Football", status: "active" },
            { id: "2", name: "Basketball", status: "active" },
            { id: "3", name: "Tennis", status: "active" },
            { id: "4", name: "Swimming", status: "active" },
            { id: "5", name: "Volleyball", status: "active" },
          ];
          setAvailableSports(defaultSports);
          setFilteredSports(defaultSports);
        }
      } catch (error) {
        // Fallback to default sports
        const defaultSports = [
          { id: "1", name: "Football", status: "active" },
          { id: "2", name: "Basketball", status: "active" },
          { id: "3", name: "Tennis", status: "active" },
          { id: "4", name: "Swimming", status: "active" },
          { id: "5", name: "Volleyball", status: "active" },
        ];
        setAvailableSports(defaultSports);
        setFilteredSports(defaultSports);
      } finally {
        setIsLoadingSports(false);
      }
    };

    loadSports();
  }, []);

  // Filter sports based on search query
  useEffect(() => {
    if (sportsSearchQuery) {
      const filtered = availableSports.filter((sport) =>
        sport.name.toLowerCase().includes(sportsSearchQuery.toLowerCase())
      );
      setFilteredSports(filtered);
    } else {
      setFilteredSports(availableSports);
    }
  }, [sportsSearchQuery, availableSports]);

  const handleCategoryChange = (value: string) => {
    setBusinessCategory(value);
    setCategoryError(false);
  };

  const handleSportsSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSportsSearchQuery(e.target.value);
  };

  const handleAddSport = (sport: Sport) => {
    if (!selectedSports.find((s) => s.id === sport.id)) {
      const updatedSports = [...selectedSports, sport];
      setSelectedSports(updatedSports);
    }
  };

  const handleRemoveSport = (sportId: string) => {
    const updatedSports = selectedSports.filter(
      (sport) => sport.id !== sportId
    );
    setSelectedSports(updatedSports);
  };

  const handleContinue = () => {
    if (!businessCategory) {
      setCategoryError(true);
      return;
    }

    setCategoryError(false);

    // Find the selected category details
    const selectedCategoryData = categories.find(
      (cat) => cat.id === businessCategory
    );

    onContinue({
      businessCategory, // This will be the category ID from admin-defined categories
      associatedSports: selectedSports,
    });
  };

  // Expose continue handler for header button
  useEffect(() => {
    // @ts-ignore
    window.handleStepContinue = handleContinue;
    return () => {
      // @ts-ignore
      delete window.handleStepContinue;
    };
  }, [businessCategory, selectedSports, categories]);

  // Prepare category options for dropdown
  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  return (
    <div className={styles.stepPageContainer}>
      <div className={styles.stepContainer}>
        <TitleDescription
          title="Category and Associated Sports"
          description="Select your business category and add sports your business is associated with."
        />

        <div className={styles.stepFormSection}>
          <div className={styles.stepInputGroup}>
            <label className={styles.stepFieldLabel}>Business Category *</label>

            <SearchDropDown
              options={categoryOptions}
              value={businessCategory}
              onChange={handleCategoryChange}
              placeholder={
                isLoadingCategories
                  ? "Loading categories..."
                  : categories.length === 0
                    ? "No categories available"
                    : "Select business category"
              }
              disabled={isLoadingCategories || categories.length === 0}
              className={categoryError ? styles.stepErrorInput : ""}
            />

            {categoryError && (
              <div className={styles.stepErrorMessage}>
                Please select a business category
              </div>
            )}

            {!isLoadingCategories && categories.length === 0 && (
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--for-light)",
                  marginTop: "8px",
                }}
              >
                Categories need to be configured by an administrator.
              </div>
            )}
          </div>

          <div className={styles.stepSearchSection}>
            <label className={styles.stepFieldLabel}>
              Associated Sports (Optional)
            </label>
            <div className={styles.stepSearchContainer}>
              <SearchInput
                placeholder="Search for sports to add"
                value={sportsSearchQuery}
                onChange={handleSportsSearch}
                disabled={isLoadingSports}
              />
            </div>

            <div className={styles.stepDataSection}>
              {isLoadingSports ? (
                <div className={styles.stepLoadingState}>Loading sports...</div>
              ) : filteredSports.length === 0 ? (
                <div className={styles.stepEmptyState}>
                  {sportsSearchQuery
                    ? `No sports found matching "${sportsSearchQuery}"`
                    : "No sports available"}
                </div>
              ) : (
                <SelectableDataTable
                  items={filteredSports}
                  selected={selectedSports}
                  onAdd={handleAddSport}
                  onRemove={(sportId: string) => handleRemoveSport(sportId)}
                  itemType="sport"
                  emptyMessage="No sports available"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
