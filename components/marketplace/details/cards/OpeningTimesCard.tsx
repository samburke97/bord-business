"use client";

import React, { useState, useEffect } from "react";
import BaseCard from "./BaseCard";
import {
  OpeningHoursData,
  DAYS_OF_WEEK,
  formatTimeRange,
} from "@/types/opening-hours";
import styles from "./OpeningTimesCard.module.css";

interface OpeningTimesCardProps {
  locationId: string;
  isAdmin?: boolean;
}

export default function OpeningTimesCard({
  locationId,
  isAdmin = false,
}: OpeningTimesCardProps) {
  const [openingHours, setOpeningHours] = useState<OpeningHoursData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpeningHours = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/marketplace/${locationId}/opening-times`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch opening hours");
        }

        const data = await response.json();
        setOpeningHours(data);
      } catch (err) {
        console.error("Error fetching opening hours:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (locationId) {
      fetchOpeningHours();
    }
  }, [locationId]);

  // Check if there are any opening hours set
  const hasOpeningHours = () => {
    if (!openingHours) return false;

    return Object.values(openingHours).some(
      (dayHours) => dayHours && dayHours.length > 0
    );
  };

  // Determine if we have opening hours data
  const hasData = hasOpeningHours();

  // Render content based on loading, error, or data state
  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loadingState}>Loading opening times...</div>
      );
    }

    if (error) {
      return <div className={styles.errorState}>{error}</div>;
    }

    if (!hasData) {
      return <div className={styles.emptyState}>No opening times found</div>;
    }

    return (
      <div className={styles.openingHoursList}>
        {DAYS_OF_WEEK.map((day, index) => {
          const dayHours = openingHours?.[index] || [];

          return (
            <div key={day} className={styles.dayRow}>
              <div className={styles.dayName}>{day}</div>
              <div className={styles.dayHours}>
                {dayHours.length > 0 ? (
                  dayHours.map((timeSlot, i) => (
                    <div key={i}>
                      {formatTimeRange(timeSlot.openTime, timeSlot.closeTime)}
                    </div>
                  ))
                ) : (
                  <div className={styles.closedText}>Closed</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <BaseCard
      title="Opening Times"
      editHref={
        isAdmin ? `/locations/edit/${locationId}/opening-times` : undefined
      }
      hasData={hasData}
      emptyStateText="No opening times found"
      locationId={locationId}
    >
      {renderContent()}
    </BaseCard>
  );
}
