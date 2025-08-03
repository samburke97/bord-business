"use client";

import BaseCard from "./BaseCard";
import styles from "./FacilitiesCard.module.css";
import Image from "next/image";

interface FacilitiesCardProps {
  locationId: string;
  facilities?: { id: string; name: string; imageUrl?: string | null }[];
}

export default function FacilitiesCard({
  locationId,
  facilities,
}: FacilitiesCardProps) {
  const hasData = Boolean(facilities && facilities.length > 0);

  const renderContent = () => {
    if (!hasData) {
      return <div className={styles.emptyState}>No facilities found</div>;
    }

    return (
      <div className={styles.facilitiesGrid}>
        {facilities!.map((facility) => (
          <div key={facility.id} className={styles.facilityTag}>
            <Image
              src={facility.imageUrl || "/icons/utility-outline/add-image.svg"}
              alt={`${facility.name} icon`}
              width={24}
              height={24}
            />
            <span>{facility.name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <BaseCard
      title="Facilities"
      editHref={`/marketplace/setup/edit/${locationId}/facilities`}
      hasData={hasData}
      emptyStateText="No facilities found"
      locationId={locationId}
    >
      {renderContent()}
    </BaseCard>
  );
}
