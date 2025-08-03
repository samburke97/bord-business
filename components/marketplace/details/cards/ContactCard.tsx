"use client";

import BaseCard from "./BaseCard";
import styles from "./ContactCard.module.css";

interface ContactCardProps {
  locationId: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

export default function ContactCard({
  locationId,
  phone,
  email,
  website,
}: ContactCardProps) {
  const hasData = !!(phone || email || website);

  const renderContent = () => {
    if (!hasData) {
      return <div className={styles.emptyState}>No details found</div>;
    }

    return (
      <div className={styles.contactInfo}>
        {phone && (
          <div className={styles.contactRow}>
            <span className={styles.contactLabel}>Contact Number:</span>
            <span className={styles.contactValue}>{phone}</span>
          </div>
        )}
        {email && (
          <div className={styles.contactRow}>
            <span className={styles.contactLabel}>Email Address:</span>
            <span className={styles.contactValue}>{email}</span>
          </div>
        )}
        {website && (
          <div className={styles.contactRow}>
            <span className={styles.contactLabel}>Website:</span>
            <span className={styles.contactValue}>{website}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <BaseCard
      title="Contact"
      editHref={`/marketplace/${locationId}/contact`}
      hasData={hasData}
      emptyStateText="No details found"
      locationId={locationId}
    >
      {renderContent()}
    </BaseCard>
  );
}
