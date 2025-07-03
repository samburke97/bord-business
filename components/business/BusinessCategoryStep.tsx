// components/business/BusinessCategoryStep.tsx
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

const BUSINESS_CATEGORIES = [
  { value: "SPORTS_CENTER", label: "Sports Center" },
  { value: "GYM", label: "Gym" },
  { value: "SWIMMING_POOL", label: "Swimming Pool" },
  { value: "TENNIS_CLUB", label: "Tennis Club" },
  { value: "FOOTBALL_CLUB", label: "Football Club" },
  { value: "BASKETBALL_COURT", label: "Basketball Court" },
  { value: "GOLF_COURSE", label: "Golf Course" },
  { value: "OTHER", label: "Other" },
];

export default function BusinessCategoryStep({
  formData,
  onContinue,
  onBack,
}: BusinessCategoryStepProps) {
  const [businessCategory, setBusinessCategory] = useState(
    formData.businessCategory || ""
  );
  const [categoryName, setCategoryName] = useState("");
  const [selectedSports, setSelectedSports] = useState<Sport[]>(
    formData.associatedSports || []
  );
  const [availableSports, setAvailableSports] = useState<Sport[]>([]);
  const [filteredSports, setFilteredSports] = useState<Sport[]>([]);
  const [sportsSearchQuery, setSportsSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Load available sports
  useEffect(() => {
    const loadSports = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/sports");
        if (response.ok) {
          const sports = await response.json();
          setAvailableSports(sports);
          setFilteredSports(sports);
        }
      } catch (error) {
        console.error("Error loading sports:", error);
        // Set some default sports if API fails
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
        setIsLoading(false);
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
    const category = BUSINESS_CATEGORIES.find((cat) => cat.value === value);
    setCategoryName(category?.label || "");
  };

  const handleSportsSearch = (value: string) => {
    setSportsSearchQuery(value);
  };

  const handleAddSport = (sport: Sport) => {
    if (!selectedSports.find((s) => s.id === sport.id)) {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const handleRemoveSport = (sportId: string) => {
    setSelectedSports(selectedSports.filter((sport) => sport.id !== sportId));
  };

  const handleContinue = () => {
    onContinue({
      businessCategory,
      associatedSports: selectedSports,
    });
  };

  // Expose the continue handler for the header button
  useEffect(() => {
    // @ts-ignore
    window.handleStepContinue = handleContinue;

    return () => {
      // @ts-ignore
      delete window.handleStepContinue;
    };
  }, [businessCategory, selectedSports]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <TitleDescription
          title="Category and Associated Sports"
          description="Select your business category and add sports your business is associated with."
        />

        <div className={styles.formSection}>
          <div className={styles.inputGroup}>
            <label htmlFor="businessCategory" className={styles.label}>
              Business Category
            </label>
            <SearchDropDown
              label=""
              value={categoryName}
              onChange={handleCategoryChange}
              placeholder="Select category"
              options={BUSINESS_CATEGORIES}
              required
            />
          </div>

          <div className={styles.sportsSection}>
            <label className={styles.label}>Associated Sports</label>
            <div className={styles.searchContainer}>
              <SearchInput
                value={sportsSearchQuery}
                onChange={(e) => handleSportsSearch(e.target.value)}
                placeholder="Search sports"
                onSearch={handleSportsSearch}
                onClear={() => handleSportsSearch("")}
              />
            </div>

            {filteredSports.length === 0 && !isLoading ? (
              <EmptyState message="No sports found." />
            ) : (
              <SelectableDataTable
                items={filteredSports}
                selected={selectedSports}
                onAdd={handleAddSport}
                onRemove={handleRemoveSport}
                isLoading={isLoading}
                itemType="sport"
                nameColumnConfig={{ header: "Sport Name", align: "left" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
