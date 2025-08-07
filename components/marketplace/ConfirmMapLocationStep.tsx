"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import TitleDescription from "@/components/ui/TitleDescription";
import styles from "./ConfirmMapLocationStep.module.css";
import "mapbox-gl/dist/mapbox-gl.css";

interface ConfirmMapLocationStepProps {
  formData: {
    name?: string;
    categoryId?: string;
    sports?: any[];
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
  const pathname = usePathname();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [currentPosition, setCurrentPosition] = useState({
    lat: formData.latitude || -26.403708,
    lng: formData.longitude || 153.033031,
  });
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const initializeMap = async () => {
      const mapboxgl = await import("mapbox-gl");
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      mapboxgl.default.accessToken = mapboxToken;

      if (!mapContainerRef.current) {
        return;
      }

      const newMap = new mapboxgl.default.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [currentPosition.lng, currentPosition.lat],
        zoom: 14,
        accessToken: mapboxToken,
      });

      newMap.addControl(new mapboxgl.default.NavigationControl(), "top-right");

      newMap.on("load", () => {
        setMapLoaded(true);

        const newMarker = new mapboxgl.default.Marker({
          draggable: true,
          color: "#000",
          scale: 1.2,
        })
          .setLngLat([currentPosition.lng, currentPosition.lat])
          .addTo(newMap);

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

      return () => {
        if (newMap) newMap.remove();
      };
    };

    initializeMap();
  }, []);

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
      // Handle error appropriately
    }
  };

  useEffect(() => {
    const isBusinessOnboarding = pathname?.includes("/business/onboarding");

    if (isBusinessOnboarding) {
      // @ts-ignore
      window.handleStepContinue = handleCreate;
    } else {
      // @ts-ignore
      window.handleMapContinue = handleCreate;
    }

    return () => {
      if (isBusinessOnboarding) {
        // @ts-ignore
        delete window.handleStepContinue;
      } else {
        // @ts-ignore
        delete window.handleMapContinue;
      }
    };
  }, [currentPosition, mode, pathname]);

  return (
    <div className={styles.stepPageContainer}>
      <div className={styles.stepContainer}>
        <TitleDescription
          title={
            mode === "edit" ? "Update Map Location" : "Confirm Map Location"
          }
          description="Drag the map so the pin matches the exact location of your business."
        />

        <div className={styles.stepFormSection}>
          <div className={styles.mapWrapper}>
            <div className={styles.mapContainer} ref={mapContainerRef}></div>
            {!mapLoaded && (
              <div className={styles.loadingIndicator}>Loading map...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
