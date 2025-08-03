// app/(list)/marketplace/page.tsx - Updated to check for existing centers
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import SecondarySidebar from "@/components/layouts/SecondarySidebar";
import Button from "@/components/ui/Button";
import LocationDetailPage from "@/components/marketplace/details/LocationDetailPage";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isStartLoading, setIsStartLoading] = useState(false);
  const [hasCenter, setHasCenter] = useState(false);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user has existing center on page load
  useEffect(() => {
    const checkCenterStatus = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Check user's business status and centers
        const response = await fetch("/api/user/business-status", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          console.log("📊 Business status for marketplace:", data);

          // If user needs business setup, they definitely don't have centers
          if (data.needsSetup) {
            setHasCenter(false);
            setIsLoading(false);
            return;
          }

          // Check if business has centers
          if (data.business?.centers && data.business.centers.length > 0) {
            setHasCenter(true);
            setCenterId(data.business.centers[0].id); // Use the first center
          } else {
            setHasCenter(false);
          }
        } else {
          console.error("Failed to fetch business status");
          setHasCenter(false);
        }
      } catch (error) {
        console.error("❌ Error checking center status:", error);
        setError("Failed to load marketplace status");
        setHasCenter(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkCenterStatus();
  }, [session?.user?.id]);

  const handleStartNow = async () => {
    try {
      setIsStartLoading(true);

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
      setIsStartLoading(false);
    }
  };

  const handleLearnMore = () => {
    router.push("/about");
  };

  // Show loading state
  if (isLoading) {
    return (
      <>
        <SecondarySidebar
          title="Online Profile"
          items={marketplaceNavItems}
          basePath="/marketplace"
        />
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading marketplace...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <SecondarySidebar
          title="Online Profile"
          items={marketplaceNavItems}
          basePath="/marketplace"
        />
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.errorState}>
              <h2>Error</h2>
              <p>{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // If user has a center, show the location detail page
  if (hasCenter && centerId) {
    return (
      <>
        <SecondarySidebar
          title="Online Profile"
          items={marketplaceNavItems}
          basePath="/marketplace"
        />
        <LocationDetailPage params={{ id: centerId }} />
      </>
    );
  }

  // If user doesn't have a center, show the onboarding page
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
              disabled={isStartLoading}
            >
              {isStartLoading ? "Loading..." : "Start Now"}
            </Button>

            <Button
              variant="secondary"
              onClick={handleLearnMore}
              className={styles.secondaryButton}
              disabled={isStartLoading}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
