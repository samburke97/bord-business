"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

// Define the context type
type LocationContextType = {
  isActive: boolean;
  updateActivationStatus: () => Promise<any>;
  setIsActive: (value: boolean) => void;
  locationId: string;
  isUpdatingStatus: boolean;
};

// Create the context with default values
const LocationContext = createContext<LocationContextType>({
  isActive: false,
  updateActivationStatus: async () => undefined,
  setIsActive: () => undefined,
  locationId: "",
  isUpdatingStatus: false,
});

// Hook to use the context
export const useLocation = () => useContext(LocationContext);

// Props for the provider component
type LocationProviderProps = {
  children: ReactNode;
  locationId: string;
  initialActiveState?: boolean;
};

// Provider component
export const LocationProvider: React.FC<LocationProviderProps> = ({
  children,
  locationId,
  initialActiveState = false,
}) => {
  const [isActive, setIsActive] = useState<boolean>(initialActiveState);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Use a ref to track the last update time for debouncing
  const lastUpdateRef = React.useRef<number>(0);

  // Function to check and update activation status
  const updateActivationStatus = useCallback(async () => {
    // Debounce the update to prevent multiple calls in rapid succession
    const now = Date.now();
    if (now - lastUpdateRef.current < 2000) {
      return null;
    }

    lastUpdateRef.current = now;

    // Don't update if we're already updating
    if (isUpdatingStatus) {
      return null;
    }

    try {
      setIsUpdatingStatus(true);

      const response = await fetch(`/api/locations/${locationId}/status`);
      if (!response.ok) {
        throw new Error("Failed to check activation status");
      }

      const data = await response.json();
      setIsActive(data.isActive);

      return data;
    } catch (error) {
      console.error("Error updating activation status:", error);
      return null;
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [locationId, isUpdatingStatus]);

  // Provide the context values to children
  return (
    <LocationContext.Provider
      value={{
        isActive,
        updateActivationStatus,
        setIsActive,
        locationId,
        isUpdatingStatus,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
