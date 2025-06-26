"use client";

import BaseCard from "./BaseCard";
import styles from "./DetailsCard.module.css";

interface DetailsCardProps {
  locationId: string;
  name: string;
  establishment?: string | null;
  sports?: { id: string; name: string; imageUrl?: string | null }[];
}

export default function DetailsCard({
  locationId,
  name,
  establishment,
  sports,
}: DetailsCardProps) {
  const hasData = !!name;

  // Format the sports list
  const formatSportsList = () => {
    if (!sports || sports.length === 0) {
      return "No sports associated";
    }

    return sports.map((sport) => sport.name).join(", ");
  };

  return (
    <BaseCard
      title="Details"
      editHref={`/locations/edit/${locationId}/details`}
      hasData={hasData}
      contentClassName={styles.detailsContent}
      emptyStateText="No details available"
    >
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Business Name:</span>
        <span className={styles.detailValue}>{name}</span>
      </div>

      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Business Type:</span>
        <span className={styles.detailValue}>
          {establishment || "Not specified"}
        </span>
      </div>

      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Associated Sports:</span>
        <span className={styles.detailValue}>{formatSportsList()}</span>
      </div>
    </BaseCard>
  );
}
