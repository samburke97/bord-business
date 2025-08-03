"use client";

import Image from "next/image";
import BaseCard from "./BaseCard";
import { getGalleryThumbUrl } from "@/lib/utils/cloudinary";
import styles from "./GalleryCard.module.css";

interface GalleryCardProps {
  locationId: string;
  locationName: string;
  images?: { id: string; imageUrl: string }[];
}

export default function GalleryCard({
  locationId,
  locationName,
  images,
}: GalleryCardProps) {
  // Determine if we have gallery images
  const hasData = !!(images && images.length > 0);

  return (
    <BaseCard
      title="Gallery"
      editHref={`/marketplace/edit/${locationId}/gallery`}
      hasData={hasData}
      contentClassName={styles.galleryContent}
      emptyStateText="No images found"
      locationId={locationId}
    >
      <div className={styles.galleryGrid}>
        {/* Show the first 5 images */}
        {images!.slice(0, 5).map((image) => (
          <div key={image.id} className={styles.galleryImage}>
            <Image
              src={getGalleryThumbUrl(image.imageUrl)}
              alt={locationName || "Location image"}
              width={140}
              height={140}
              className={styles.imageThumb}
              style={{ objectFit: "cover" }}
              unoptimized={false}
              priority={true}
            />
          </div>
        ))}

        {Array.from({
          length: Math.max(0, 5 - (images?.length || 0)),
        }).map((_, i) => (
          <div
            key={`placeholder-${i}`}
            className={`${styles.galleryImage} ${styles.placeholder}`}
          />
        ))}
      </div>
    </BaseCard>
  );
}
