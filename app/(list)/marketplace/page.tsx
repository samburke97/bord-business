"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SecondarySidebar from "@/components/layouts/SecondarySidebar";
import Button from "@/components/ui/Button";
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
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleStartNow = () => {
    // Always go to marketplace setup
    router.push("/marketplace/setup");
  };

  const handleLearnMore = () => {
    router.push("/about");
  };

  return (
    <>
      <SecondarySidebar
        title="Online Profile"
        items={marketplaceNavItems}
        basePath="/marketplace"
      />

      <div className={styles.container}>
        {/* Background Art Layers */}
        <div className={styles.backgroundArt}>
          <img
            src="/images/backgrounds/dots.svg"
            className={styles.dotsPattern}
            alt=""
          />
          <img
            src="/images/backgrounds/lines.svg"
            className={styles.linesPattern}
            alt=""
          />
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Main Heading */}
          <h1 className={styles.title}>
            Go live on the bord
            <br />
            marketplace today
          </h1>

          {/* Subtitle */}
          <p className={styles.description}>
            Finish setting up your business to create a listing on the
            marketplace.
          </p>

          {/* Action Buttons */}
          <div className={styles.buttonContainer}>
            <Button
              variant="primary-green"
              onClick={handleStartNow}
              className={styles.primaryButton}
            >
              Start Now
            </Button>

            <Button
              variant="secondary"
              onClick={handleLearnMore}
              className={styles.secondaryButton}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
