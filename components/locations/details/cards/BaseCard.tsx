"use client";

import Link from "next/link";
import { ReactNode } from "react";
import Image from "next/image";
import IconButton from "@/components/ui/IconButton";
import styles from "./BaseCard.module.css";

interface BaseCardProps {
  title: string;
  editHref?: string;
  hasData: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  emptyStateText?: string;
  locationId?: string;
  updateActivationStatus?: () => Promise<void>;
}

export default function BaseCard({
  title,
  editHref,
  hasData,
  children,
  className = "",
  contentClassName = "",
  emptyStateText = "No data available",
}: BaseCardProps) {
  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.cardHeader}>
        <h2>{title}</h2>
        {editHref && (
          <Link href={editHref}>
            <IconButton
              icon={
                <Image
                  src={
                    hasData
                      ? "/icons/utility-outline/edit.svg"
                      : "/icons/utility-outline/plus.svg"
                  }
                  alt={hasData ? "Edit" : "Add"}
                  width={16}
                  height={16}
                />
              }
              variant="ghost"
              aria-label={hasData ? `Edit ${title}` : `Add ${title}`}
            />
          </Link>
        )}
      </div>
      <div className={`${styles.cardContent} ${contentClassName}`}>
        {hasData ? (
          children
        ) : (
          <div className={styles.emptyState}>{emptyStateText}</div>
        )}
      </div>
    </div>
  );
}
