// components/locations/SetLocationStep.tsx - ORIGINAL FUNCTIONALITY, CONSISTENT STYLING ONLY
"use client";

import { useState, useRef, useEffect } from "react";
import SearchInput from "@/components/ui/SearchInput";
import styles from "./SetLocationStep.module.css";
import TitleDescription from "../ui/TitleDescription";

const MAPBOX_GEOCODING_URL =
  "https://api.mapbox.com/geocoding/v5/mapbox.places";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface SetLocationStepProps {
  formData: {
    address: string;
    streetAddress?: string;
    aptSuite?: string;
    city?: string;
    state?: string;
    postcode?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  onContinue: (data: any) => void;
  onBack: () => void;
}

interface GeocodeFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  context: Array<{
    id: string;
    text: string;
  }>;
  properties: {
    address?: string;
  };
  text: string;
}

export default function SetLocationStep({
  formData,
  onContinue,
  onBack,
}: SetLocationStepProps) {
  // State for the search input and results
  const [searchQuery, setSearchQuery] = useState(formData.address || "");
  const [searchResults, setSearchResults] = useState<GeocodeFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to search for addresses using Mapbox geocoding API
  const searchAddress = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(
        query
      )}.json?access_token=${MAPBOX_TOKEN}&country=au&types=address&limit=5`;

      // Limit search to Australia with country code 'au'
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", errorText);
        throw new Error("Failed to fetch address suggestions");
      }

      const data = await response.json();

      setSearchResults(data.features || []);
      setIsDropdownOpen(true);
    } catch (error) {
      console.error("💥 Catch block error:", error);
      setSearchResults([]);
      setIsDropdownOpen(true); // Still show dropdown for "Add Manually" option
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout to search after 300ms of typing
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(query);
    }, 300);
  };

  // Clear search input and results
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsDropdownOpen(false);
  };

  // Extract address components from a place feature
  const extractAddressComponents = (feature: GeocodeFeature) => {
    const addressParts = feature.place_name.split(", ");

    // Basic extraction logic
    const streetAddress = addressParts[0] || "";

    let city = "";
    let state = "";
    let postcode = "";

    // Extract city, state, postcode from context
    if (feature.context) {
      feature.context.forEach((item) => {
        if (item.id.startsWith("place")) {
          city = item.text;
        } else if (item.id.startsWith("region")) {
          state = item.text;
        } else if (item.id.startsWith("postcode")) {
          postcode = item.text;
        }
      });
    }

    return {
      streetAddress,
      city,
      state,
      postcode,
      latitude: feature.center[1], // Latitude is the second value in the center array
      longitude: feature.center[0], // Longitude is the first value in the center array
      address: feature.place_name, // Full formatted address
    };
  };

  // Handle selection of an address from the dropdown
  const handleAddressSelect = (feature: GeocodeFeature) => {
    const addressComponents = extractAddressComponents(feature);

    setSearchQuery(feature.place_name);
    setIsDropdownOpen(false);

    // Continue to the next step with the selected address
    onContinue({
      address: feature.place_name,
      streetAddress: addressComponents.streetAddress,
      city: addressComponents.city,
      state: addressComponents.state,
      postcode: addressComponents.postcode,
      latitude: addressComponents.latitude,
      longitude: addressComponents.longitude,
    });
  };

  // Handle the "Add Manually" button click
  const handleAddManually = () => {
    onContinue({
      address: searchQuery,
    });
  };

  // Handle the header continue button
  const handleContinueFromHeader = () => {
    if (searchQuery) {
      onContinue({
        address: searchQuery,
        ...(searchQuery === formData.address
          ? {
              streetAddress: formData.streetAddress,
              city: formData.city,
              state: formData.state,
              postcode: formData.postcode,
              latitude: formData.latitude,
              longitude: formData.longitude,
            }
          : {}),
      });
    }
  };

  useEffect(() => {
    // @ts-ignore
    window.handleStepContinue = handleContinueFromHeader;

    return () => {
      // @ts-ignore
      delete window.handleStepContinue;
    };
  }, [searchQuery, formData]);

  return (
    <div className={styles.stepPageContainer}>
      <div className={styles.stepContainer}>
        <TitleDescription
          title="Set Business Location"
          description="Use the search bar below to search for your address, if it doesn't appear you can add it manually."
        />

        <div className={styles.stepFormSection}>
          <div className={styles.formField}>
            <div className={styles.searchContainer}>
              <SearchInput
                placeholder="Search for your address"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onClear={clearSearch}
                label="Business Address"
              />

              {isDropdownOpen && (
                <div className={styles.searchResults}>
                  {isLoading ? (
                    <div className={styles.loading}>Loading results...</div>
                  ) : searchResults.length > 0 ? (
                    // Show search results if available
                    searchResults.map((feature) => (
                      <div
                        key={feature.id}
                        className={styles.searchResultItem}
                        onClick={() => handleAddressSelect(feature)}
                      >
                        <span className={styles.locationIcon}>
                          <img
                            src="/icons/utility-outline/location.svg"
                            alt="Location"
                            width={20}
                            height={20}
                          />
                        </span>
                        <span>{feature.place_name}</span>
                      </div>
                    ))
                  ) : (
                    // No results found message
                    <div className={styles.noResults}>
                      No addresses found matching your search.
                    </div>
                  )}

                  <div className={styles.addManuallyContainer}>
                    <button
                      type="button"
                      onClick={handleAddManually}
                      className={styles.addManuallyButton}
                    >
                      <span className={styles.plusIcon}>+</span>
                      <span className={styles.addManuallyText}>
                        Add Manually
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
