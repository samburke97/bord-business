"use client";

import BaseCard from "./BaseCard";
import styles from "./ActivitiesCard.module.css";

interface Activity {
  id: string;
  title: string;
  price: string;
  imageUrl: string;
}

interface ActivitiesCardProps {
  locationId: string;
  activities?: Activity[];
}

export default function ActivitiesCard({
  locationId,
  activities = [],
}: ActivitiesCardProps) {
  const hasActivities = activities && activities.length > 0;

  return (
    <BaseCard
      title="Activities"
      editHref={`/locations/edit/${locationId}/activities`}
      hasData={hasActivities}
      className={styles.activitiesCard}
      contentClassName={styles.activitiesContent}
      emptyStateText="No activities to display"
      locationId={locationId}
    >
      {hasActivities && (
        <div className={styles.activitiesList}>
          {activities.map((activity) => (
            <div key={activity.id} className={styles.activityItem}>
              <div className={styles.activityImageContainer}>
                {activity.imageUrl ? (
                  <img
                    src={activity.imageUrl}
                    alt={activity.title}
                    className={styles.activityImage}
                  />
                ) : (
                  <div className={styles.activityImagePlaceholder}>
                    <span>No Image</span>
                  </div>
                )}
              </div>
              <div className={styles.activityDetails}>
                <h3 className={styles.activityTitle}>{activity.title}</h3>
                <p className={styles.activityPrice}>{activity.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseCard>
  );
}
