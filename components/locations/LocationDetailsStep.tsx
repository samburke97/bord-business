"use client";

import { useState, useEffect, useCallback } from "react";
import TextInput from "@/components/ui/TextInput";
import SearchInput from "@/components/ui/SearchInput";
import SelectableDataTable from "@/components/ui/SelectableDataTable";
import TitleDescription from "@/components/ui/TitleDescription";
import Toast from "@/components/ui/Toast";
import styles from "./LocationDetailsStep.module.css";
import SearchDropDown from "../ui/SearchDropDown";

interface LocationDetailsStepProps {
  formData: {
    name: string;
    categoryId: string;
    sports: any[];
  };
  onContinue: (data: any) => void;
}

interface Category {
  id: string;
  name: string;
}

interface Sport {
  id: string;
  name: string;
  imageUrl?: string;
}

// Define validator errors for each field
interface FormErrors {
  name: string | null;
  category: string | null;
}

export default function LocationDetailsStep({
  formData,
  onContinue,
}: LocationDetailsStepProps) {
  // Form state
  const [name, setName] = useState(formData.name || "");
  const [categoryId, setCategoryId] = useState(formData.categoryId || "");
  const [categoryName, setCategoryName] = useState("");
  const [selectedSports, setSelectedSports] = useState<Sport[]>(
    formData.sports || []
  );

  // Data loading state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [filteredSports, setFilteredSports] = useState<Sport[]>([]);
  const [sportsSearchQuery, setSportsSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Name validation state
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [nameCheckTimeout, setNameCheckTimeout] =
    useState<NodeJS.Timeout | null>(null);

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({
    name: null,
    category: null,
  });
  const [hasSubmitAttempt, setHasSubmitAttempt] = useState(false);

  // Notification state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  // Define the search handler for sports search
  const handleSportsSearch = (query: string) => {
    setSportsSearchQuery(query);
  };

  // Fetch categories and sports on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch categories
        const categoriesResponse = await fetch("/api/groups/categories");
        if (!categoriesResponse.ok) {
          throw new Error("Failed to fetch categories");
        }
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        // Transform categories into options format for SearchDropDown
        const options = categoriesData.map((category: Category) => ({
          value: category.id,
          label: category.name,
        }));
        setCategoryOptions(options);

        // If we have a selected categoryId, find and set the selected category
        if (formData.categoryId) {
          const category = categoriesData.find(
            (c: Category) => c.id === formData.categoryId
          );
          if (category) {
            setCategoryName(category.name);
          }
        }

        // Fetch sports
        const sportsResponse = await fetch("/api/sports");
        if (!sportsResponse.ok) {
          throw new Error("Failed to fetch sports");
        }
        const sportsData = await sportsResponse.json();
        setSports(sportsData);
        setFilteredSports(sportsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        showToast("Failed to load data", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [formData.categoryId]);

  // Filter sports based on search query
  useEffect(() => {
    if (sportsSearchQuery) {
      const filtered = sports.filter((sport) =>
        sport.name.toLowerCase().includes(sportsSearchQuery.toLowerCase())
      );
      setFilteredSports(filtered);
    } else {
      setFilteredSports(sports);
    }
  }, [sportsSearchQuery, sports]);

  // Function to check if a center name already exists
  const checkCenterNameExists = useCallback(
    async (centerName: string): Promise<boolean> => {
      if (!centerName.trim() || centerName.length < 3) {
        return false; // Don't check if name is too short
      }

      try {
        setIsCheckingName(true);

        // We're now using the dedicated endpoint
        const response = await fetch(
          `/api/locations/check-name?name=${encodeURIComponent(centerName)}`
        );

        if (!response.ok) {
          return false;
        }

        const data = await response.json();

        // Force UI update if duplicate found
        if (data.exists) {
          // Immediately force error display even if not submitted yet
          setErrors((prev) => ({
            ...prev,
            name: "This location name already exists",
          }));
        }

        return data.exists;
      } catch (error) {
        console.error("Error checking center name:", error);
        return false; // Assume it doesn't exist in case of error
      } finally {
        setIsCheckingName(false);
      }
    },
    [setErrors]
  );

  // Validate name field with duplicate check
  const validateName = async (value: string): Promise<string | null> => {
    if (!value.trim()) {
      return "Location name is required";
    }

    if (value.trim().length < 3) {
      return "Name must be at least 3 characters";
    }

    if (nameExists) {
      return "This location name already exists";
    }

    return null;
  };

  // Handle name input change with debounced duplicate check
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setName(newValue);

    // Reset nameExists state when the name changes
    setNameExists(false);

    // Clear previous error immediately when typing
    setErrors((prev) => ({ ...prev, name: null }));

    // Clear any existing timeout
    if (nameCheckTimeout) {
      clearTimeout(nameCheckTimeout);
    }

    // Set a new timeout to check the name after a delay
    const timeoutId = setTimeout(async () => {
      if (newValue.trim().length >= 3) {
        const exists = await checkCenterNameExists(newValue);
        setNameExists(exists);

        // Always show error immediately if the name exists
        if (exists) {
          setErrors((prev) => ({
            ...prev,
            name: "This location name already exists",
          }));
        } else if (hasSubmitAttempt) {
          // Only re-validate other aspects if we've attempted to submit
          const nameError = await validateName(newValue);
          setErrors((prev) => ({ ...prev, name: nameError }));
        }
      }
    }, 500); // 500ms delay to avoid making too many requests

    setNameCheckTimeout(timeoutId);
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    // Find category by id
    const category = categories.find((c) => c.id === value);

    if (category) {
      setCategoryId(category.id);
      setCategoryName(category.name);
    } else {
      setCategoryId("");
      setCategoryName(value); // If no match, just store the value as name
    }

    // If the user has attempted to submit, update errors
    if (hasSubmitAttempt) {
      setErrors((prev) => ({
        ...prev,
        category: !value ? "Category is required" : null,
      }));
    }
  };

  // Show toast notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({
      visible: true,
      message,
      type,
    });
  };

  // Close toast handler
  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Sport handlers
  const handleAddSport = async (sport: Sport) => {
    setSelectedSports((prev) => [...prev, sport]);
    showToast(`Added ${sport.name} to location`, "success");
  };

  const handleRemoveSport = async (sportId: string) => {
    const sportName =
      selectedSports.find((s) => s.id === sportId)?.name || "sport";

    const updatedSports = selectedSports.filter(
      (sport) => sport.id !== sportId
    );
    setSelectedSports(updatedSports);
    showToast(`Removed ${sportName} from location`, "success");
  };

  // Handle form submission
  const handleContinue = async () => {
    // Mark as having attempted submission
    setHasSubmitAttempt(true);

    // Check name is valid
    if (!name.trim() || name.trim().length < 3) {
      setErrors((prev) => ({
        ...prev,
        name: !name.trim()
          ? "Location name is required"
          : "Name must be at least 3 characters",
      }));
      return;
    }

    // Final duplicate check
    if (name.trim().length >= 3) {
      const exists = await checkCenterNameExists(name);

      if (exists) {
        setNameExists(exists);
        setErrors((prev) => ({
          ...prev,
          name: "This location name already exists",
        }));
        return;
      }
    }

    onContinue({
      name,
      categoryId,
      sports: selectedSports,
    });
  };

  // Expose the continue handler for the header button
  useEffect(() => {
    // @ts-ignore
    window.handleDetailsStepContinue = handleContinue;

    return () => {
      // @ts-ignore
      delete window.handleDetailsStepContinue;
    };
  }, [name, categoryId, selectedSports, nameExists]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (nameCheckTimeout) {
        clearTimeout(nameCheckTimeout);
      }
    };
  }, [nameCheckTimeout]);

  return (
    <div className={styles.container}>
      <TitleDescription
        title="Location Details"
        description="Please add the location name, the location category, and its associated sports."
      />

      <div className={styles.formField}>
        <TextInput
          id="locationName"
          label="Name"
          value={name}
          onChange={handleNameChange}
          maxLength={50}
          showCharCount={true}
          error={errors.name}
          required={true}
          placeholder="Enter a location name"
        />
      </div>

      <div className={styles.formField}>
        <div className={styles.categoryContainer}>
          <SearchDropDown
            id="category"
            label="Category"
            value={categoryId}
            onChange={handleCategoryChange}
            options={categoryOptions}
            placeholder="Select a category"
            error={errors.category}
            required={false}
          />
        </div>
      </div>

      <div className={styles.formField}>
        <SearchInput
          label="Add Associated Sports"
          value={sportsSearchQuery}
          onChange={(e) => handleSportsSearch(e.target.value)}
          onClear={() => handleSportsSearch("")}
          placeholder="Search for sports"
        />

        <SelectableDataTable
          items={filteredSports}
          selected={selectedSports}
          onAdd={handleAddSport}
          onRemove={handleRemoveSport}
          isLoading={isLoading}
          emptyMessage="No sports found."
          itemType="sport"
        />
      </div>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={handleCloseToast}
        />
      )}
    </div>
  );
}
