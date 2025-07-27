"use client";

import React from "react";
import styles from "./TitleDescription.module.css";

interface TitleDescriptionProps {
  title: string;
  description?: string;
  className?: string;
}

const TitleDescription: React.FC<TitleDescriptionProps> = ({
  title,
  description,
  className = "",
}) => {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>
      </div>
      {description && <p>{description}</p>}
    </div>
  );
};

export default TitleDescription;
