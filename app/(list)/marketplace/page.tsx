"use client";

import SecondarySidebar from "@/components/layouts/SecondarySidebar";
import styles from "./page.module.css";

// Define the sub-navigation items for marketplace
const marketplaceNavItems = [
  { href: "/marketplace", label: "Overview" },
  { href: "/marketplace/details", label: "Details" },
  { href: "/marketplace/location", label: "Location" },
  { href: "/marketplace/gallery", label: "Gallery" },
  { href: "/marketplace/about", label: "About" },
  { href: "/marketplace/opening-times", label: "Opening Times" },
  { href: "/marketplace/facilities", label: "Facilities" },
  { href: "/marketplace/contact", label: "Contact & Links" },
];

export default function MarketplacePage() {
  return (
    <div className={styles.pageContainer}>
      <SecondarySidebar
        title="Online Profile"
        items={marketplaceNavItems}
        basePath="/marketplace"
      />

      <div className={styles.content}>
        <div className={styles.contentInner}>
          <h1 className={styles.pageTitle}>Marketplace Overview</h1>
          <p className={styles.pageDescription}>
            Manage your online profile and marketplace presence. Configure your
            business details, location, gallery, and other settings to attract
            more customers.
          </p>

          <div className={styles.overviewCards}>
            <div className={styles.card}>
              <h3>Profile Status</h3>
              <p>Your profile is 85% complete</p>
            </div>

            <div className={styles.card}>
              <h3>Visibility</h3>
              <p>Your profile is live on the marketplace</p>
            </div>

            <div className={styles.card}>
              <h3>Recent Activity</h3>
              <p>3 new profile views this week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
