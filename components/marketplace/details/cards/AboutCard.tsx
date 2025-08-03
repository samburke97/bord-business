"use client";

import BaseCard from "./BaseCard";
import styles from "./AboutCard.module.css";

interface AboutCardProps {
  locationId: string;
  description?: string | null;
  highlights?: string[];
}

export default function AboutCard({
  locationId,
  description,
  highlights = [],
}: AboutCardProps) {
  const hasData = !!(description || (highlights && highlights.length > 0));

  return (
    <BaseCard
      title="About"
      editHref={`/marketplace/${locationId}/about`}
      hasData={hasData}
      className={styles.aboutCard}
      contentClassName={styles.aboutContent}
      emptyStateText="No details found"
      locationId={locationId}
    >
      {description && <p className={styles.aboutText}>{description}</p>}

      {highlights && highlights.length > 0 && (
        <div className={styles.highlightsContainer}>
          {highlights.map((highlight, index) => (
            <div key={index} className={styles.highlightItem}>
              {highlight}
            </div>
          ))}
        </div>
      )}
    </BaseCard>
  );
}
