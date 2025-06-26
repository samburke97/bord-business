"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./ConfirmMapLocationStep.module.css";
import TitleDescription from "../ui/TitleDescription";
import "mapbox-gl/dist/mapbox-gl.css";

interface ConfirmMapLocationStepProps {
  formData: {
    name: string;
    categoryId: string;
    sports: any[];
    streetAddress?: string;
    aptSuite?: string;
    city?: string;
    state?: string;
    postcode?: string;
    latitude?: number | null;
    longitude?: number | null;
    address?: string;
  };
  onContinue: (data: any) => Promise<any>;
  onBack: () => void;
  mode?: "create" | "edit";
}

export default function ConfirmMapLocationStep({
  formData,
  onContinue,
  onBack,
  mode = "create",
}: ConfirmMapLocationStepProps) {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [marker, setMarker] = useState<mapboxgl.Marker | null>(null);
  const [currentPosition, setCurrentPosition] = useState({
    lat: formData.latitude || -26.403708,
    lng: formData.longitude || 153.033031,
  });
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import mapbox-gl
    const initializeMap = async () => {
      const mapboxgl = await import("mapbox-gl");
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      mapboxgl.default.accessToken = mapboxToken;

      if (!mapContainerRef.current) {
        console.error("Map container ref is null");
        return;
      }

      // Initialize the map
      const newMap = new mapboxgl.default.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [currentPosition.lng, currentPosition.lat],
        zoom: 14,
        accessToken: mapboxToken,
      });

      // Add navigation controls
      newMap.addControl(new mapboxgl.default.NavigationControl(), "top-right");

      // Create the marker when the map loads
      newMap.on("load", () => {
        setMapLoaded(true);

        // Create a draggable marker with a clear color
        const newMarker = new mapboxgl.default.Marker({
          draggable: true,
          color: "#000",
          scale: 1.2,
        })
          .setLngLat([currentPosition.lng, currentPosition.lat])
          .addTo(newMap);

        // Update position when marker is dragged
        newMarker.on("dragend", () => {
          const lngLat = newMarker.getLngLat();
          setCurrentPosition({
            lng: lngLat.lng,
            lat: lngLat.lat,
          });
        });

        setMarker(newMarker);
      });

      setMap(newMap);

      // Clean up on unmount
      return () => {
        if (newMap) newMap.remove();
      };
    };

    initializeMap();
  }, []);

  // Update marker position if formData coordinates change
  useEffect(() => {
    if (marker && formData.latitude && formData.longitude) {
      marker.setLngLat([formData.longitude, formData.latitude]);
    }
  }, [formData.latitude, formData.longitude, marker]);

  const handleCreate = async () => {
    try {
      const locationData = {
        latitude: currentPosition.lat,
        longitude: currentPosition.lng,
      };

      await onContinue(locationData);
    } catch (error) {
      console.error(
        `Error ${mode === "create" ? "creating" : "updating"} location:`,
        error
      );
    }
  };

  // Expose the continue handler for the header button
  useEffect(() => {
    // @ts-ignore
    window.handleMapContinue = handleCreate;

    return () => {
      // @ts-ignore
      delete window.handleMapContinue;
    };
  }, [currentPosition, mode]); // Re-register when position changes or mode changes

  return (
    <div className={styles.container}>
      <TitleDescription
        title={mode === "edit" ? "Update Map Location" : "Confirm Map Location"}
        description="Drag the map so the pin matches the exact location of your business."
      />
      <div className={styles.mapWrapper}>
        <div className={styles.mapContainer} ref={mapContainerRef}></div>
        {!mapLoaded && (
          <div className={styles.loadingIndicator}>Loading map...</div>
        )}
      </div>
    </div>
  );
}
