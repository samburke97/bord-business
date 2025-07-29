"use client";

import { useEffect, useRef } from "react";
import BaseCard from "./BaseCard";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface AddressCardProps {
  locationId: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export default function AddressCard({
  locationId,
  address,
  latitude,
  longitude,
}: AddressCardProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Determine if we have address data
  const hasData = !!(address || (latitude && longitude));

  // Default to a fallback location if no coordinates provided
  const mapLat = latitude || -26.403708;
  const mapLng = longitude || 153.033031;

  useEffect(() => {
    if (!hasData || !mapContainerRef.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [mapLng, mapLat],
      zoom: 14,
      interactive: false,
    });

    new mapboxgl.Marker({
      color: "#000",
      scale: 1,
    })
      .setLngLat([mapLng, mapLat])
      .addTo(map);

    // Clean up on unmount
    return () => map.remove();
  }, [hasData, mapLat, mapLng]);

  return (
    <BaseCard
      title="Address"
      editHref={`/locations/edit/${locationId}/address`}
      hasData={hasData}
      emptyStateText="No address provided"
      contentClassName="p-0"
      locationId={locationId}
    >
      {hasData && (
        <>
          <div ref={mapContainerRef} className="w-full h-40 relative rounded" />
        </>
      )}
    </BaseCard>
  );
}
