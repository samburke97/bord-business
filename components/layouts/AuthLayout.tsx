"use client";

import { ReactNode } from "react";
import ActionHeader from "./headers/ActionHeader";
import styles from "./AuthLayout.module.css";

interface AuthSplitLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
  heroImage?: string;
  heroAlt?: string;
  backgroundColor?: string;
}

export default function AuthLayout({
  children,
  showBackButton = true,
  onBackClick,
  heroImage = "/images/auth-hero.jpg", // Default hero image
  heroAlt = "Bord Business",
  backgroundColor = "var(--bg-standard)",
}: AuthSplitLayoutProps) {
  return (
    <div className={styles.container} style={{ backgroundColor }}>
      {/* Action Header */}
      {showBackButton && (
        <ActionHeader
          type="back"
          secondaryAction={onBackClick}
          constrained={false}
        />
      )}

      {/* Split Content */}
      <div className={styles.content}>
        {/* Left Section - Form */}
        <div className={styles.leftSection}>
          <div className={styles.formContainer}>{children}</div>
        </div>

        {/* Right Section - Hero Image */}
        <div className={styles.rightSection}>
          <div className={styles.heroContainer}>
            {heroImage && (
              <img src={heroImage} alt={heroAlt} className={styles.heroImage} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
