// app/(list)/marketplace/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [isLoading, setIsLoading] = useState(false);

  const handleStartNow = async () => {
    try {
      setIsLoading(true);

      // Check if user needs business setup first
      const response = await fetch("/api/user/business-status", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Business status for marketplace:", data);

        // If user needs business setup, redirect there first
        if (data.needsSetup) {
          console.log(
            "🔄 User needs business setup, redirecting to onboarding"
          );
          router.push("/business/onboarding");
          return;
        }
      }

      // Always go to marketplace setup - let the setup flow handle existing centers
      console.log("🚀 Starting marketplace setup flow");
      router.push("/marketplace/setup");
    } catch (error) {
      console.error("❌ Error checking business status:", error);
      // Fallback to setup flow anyway
      router.push("/marketplace/setup");
    } finally {
      setIsLoading(false);
    }
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
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Start Now"}
            </Button>

            <Button
              variant="secondary"
              onClick={handleLearnMore}
              className={styles.secondaryButton}
              disabled={isLoading}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
