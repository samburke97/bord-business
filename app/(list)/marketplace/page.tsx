"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SecondarySidebar from "@/components/layouts/SecondarySidebar";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import LocationDetailPage from "@/components/locations/details/LocationDetailPage";
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

interface MarketplaceStatus {
  isComplete: boolean;
  businessId: string | null;
  completedSections: {
    about: boolean;
    gallery: boolean;
    openingTimes: boolean;
    facilities: boolean;
    contact: boolean;
  };
}

export default function MarketplacePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [marketplaceStatus, setMarketplaceStatus] =
    useState<MarketplaceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkMarketplaceStatus = async () => {
      if (status === "loading") return;

      if (!session?.user) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/user/marketplace-status", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch marketplace status");
        }

        const data = await response.json();
        setMarketplaceStatus(data);
      } catch (err) {
        console.error("Error checking marketplace status:", err);
        setError("Failed to load marketplace status");
      } finally {
        setIsLoading(false);
      }
    };

    checkMarketplaceStatus();
  }, [session, status, router]);

  const handleStartNow = () => {
    router.push("/marketplace/setup");
  };

  const handleLearnMore = () => {
    router.push("/about");
  };

  if (status === "loading" || isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <SecondarySidebar
          title="Online Profile"
          items={marketplaceNavItems}
          basePath="/marketplace"
        />
        <div className={styles.content}>
          <div className={styles.contentInner}>
            <h1 className={styles.pageTitle}>Something went wrong</h1>
            <p className={styles.pageDescription}>{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  // If marketplace profile is complete, show the business location detail page (no sidebar)
  if (marketplaceStatus?.isComplete && marketplaceStatus.businessId) {
    return <LocationDetailPage id={marketplaceStatus.businessId} />;
  }

  // If marketplace profile is not complete, show the onboarding CTA WITH sidebar
  return (
    <div className={styles.pageContainer}>
      <SecondarySidebar
        title="Online Profile"
        items={marketplaceNavItems}
        basePath="/marketplace"
      />

      <div className={styles.content}>
        <div className={styles.contentInner}>
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
          <div className={styles.onboardingContent}>
            {/* Main Heading */}
            <h1 className={styles.title}>
              Complete your profile and
              <br />
              go live on the marketplace
            </h1>

            {/* Subtitle */}
            <p className={styles.description}>
              Finish setting up your business profile to attract
              <br />
              players from all types of fields.
            </p>

            {/* Progress Indicator */}
            {marketplaceStatus && (
              <div className={styles.progressContainer}>
                <div className={styles.progressText}>
                  Profile:{" "}
                  {
                    Object.values(marketplaceStatus.completedSections).filter(
                      Boolean
                    ).length
                  }
                  /5 sections complete
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={styles.buttonContainer}>
              <Button
                variant="primary-green"
                onClick={handleStartNow}
                className={styles.primaryButton}
              >
                Complete Profile
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
      </div>
    </div>
  );
}
