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
  center: [number, number];
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
  const [searchQuery, setSearchQuery] = useState(formData.address || "");
  const [searchResults, setSearchResults] = useState<GeocodeFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Failed to fetch address suggestions");
      }

      const data = await response.json();

      setSearchResults(data.features || []);
      setIsDropdownOpen(true);
    } catch (error) {
      setSearchResults([]);
      setIsDropdownOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(query);
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsDropdownOpen(false);
  };

  const extractAddressComponents = (feature: GeocodeFeature) => {
    const addressParts = feature.place_name.split(", ");

    const streetAddress = addressParts[0] || "";

    let city = "";
    let state = "";
    let postcode = "";

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
      latitude: feature.center[1],
      longitude: feature.center[0],
      address: feature.place_name,
    };
  };

  const handleAddressSelect = (feature: GeocodeFeature) => {
    const addressComponents = extractAddressComponents(feature);

    setSearchQuery(feature.place_name);
    setIsDropdownOpen(false);

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

  const handleAddManually = () => {
    onContinue({
      address: searchQuery,
    });
  };

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
    window.handleLocationContinue = handleContinueFromHeader;

    return () => {
      // @ts-ignore
      delete window.handleLocationContinue;
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
                    <div className={styles.noResults}>
                      No addresses found matching your search.
                    </div>
                  )}

                  {searchQuery && (
                    <div className={styles.addManuallyContainer}>
                      <button
                        className={styles.addManuallyButton}
                        onClick={handleAddManually}
                      >
                        <span className={styles.plusIcon}>+</span>
                        <span className={styles.addManuallyText}>
                          Add "{searchQuery}" manually
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
