"use client";

import React from "react";
import CountBadge from "./CountBadge";
import styles from "./TitleDescription.module.css";

interface TitleDescriptionProps {
  title: string;
  description?: string;
  count?: number;
  className?: string;
}

const TitleDescription: React.FC<TitleDescriptionProps> = ({
  title,
  description,
  count,
  className = "",
}) => {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.titleRow}>
        <h1>{title}</h1>
        {typeof count === "number" && <CountBadge count={count} />}
      </div>
      {description && <p>{description}</p>}
    </div>
  );
};

export default TitleDescription;
