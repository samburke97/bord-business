// app/(list)/marketplace/page.tsx - DYNAMIC VERSION
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import SecondarySidebar from "@/components/layouts/SecondarySidebar";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Location Detail Components (when setup is complete)
import DetailsCard from "@/components/marketplace/details/cards/DetailsCard";
import AddressCard from "@/components/marketplace/details/cards/AddressCard";
import GalleryCard from "@/components/marketplace/details/cards/GalleryCard";
import AboutCard from "@/components/marketplace/details/cards/AboutCard";
import OpeningTimesCard from "@/components/marketplace/details/cards/OpeningTimesCard";
import FacilitiesCard from "@/components/marketplace/details/cards/FacilitiesCard";
import ContactCard from "@/components/marketplace/details/cards/ContactCard";
import ActivitiesCard from "@/components/marketplace/details/cards/ActvitiesCard";
import ConfirmModal from "@/components/modals/ConfirmModal";
import { checkActivationStatus } from "@/lib/services/locationEditService";

import marketplaceStyles from "./page.module.css";
import detailStyles from "@/components/marketplace/details/LocationDetailPage.module.css";

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

interface LocationDetail {
  id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  highlights?: string[];
  phone?: string | null;
  email?: string | null;
  establishment?: string | null;
  establishmentId?: string | null;
  isActive: boolean;
  status: string;
  tags: { id: string; name: string; imageUrl?: string | null }[];
  facilities: { id: string; name: string; imageUrl?: string | null }[];
  sports: { id: string; name: string; imageUrl?: string | null }[];
  images: { id: string; imageUrl: string }[];
  links?: { id: string; type?: string | null; url?: string | null }[];
  socials?: { id: string; platform?: string | null; url?: string | null }[];
  lastEdited: string;
  activities?: { id: string; title: string; price: string; imageUrl: string }[];
}

export default function MarketplacePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Loading and error states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup completion state
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);
  const [centerId, setCenterId] = useState<string | null>(null);

  // Location detail state (when setup is complete)
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<boolean>(false);

  // Check if user has completed marketplace setup
  const checkSetupStatus = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsInitialLoading(true);
      setError(null);

      // Get user's business status and centers
      const response = await fetch("/api/user/business-status", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get business information");
      }

      const data = await response.json();

      // If user needs business setup, they haven't completed marketplace setup
      if (data.needsSetup || !data.business) {
        setHasCompletedSetup(false);
        return;
      }

      // Check if business has centers
      if (data.business.centers && data.business.centers.length > 0) {
        const centerInfo = data.business.centers[0];
        setCenterId(centerInfo.id);

        // Fetch the center details to check if setup is complete
        const centerResponse = await fetch(`/api/marketplace/${centerInfo.id}`);

        if (centerResponse.ok) {
          const centerData = await centerResponse.json();

          // Check if all required fields are completed (7 terms)
          const hasRequiredData = checkIfSetupComplete(centerData);

          if (hasRequiredData) {
            setHasCompletedSetup(true);
            setLocation(centerData);
            setLocationStatus(centerData.isActive);
          } else {
            setHasCompletedSetup(false);
          }
        } else {
          setHasCompletedSetup(false);
        }
      } else {
        setHasCompletedSetup(false);
      }
    } catch (error) {
      console.error("Error checking setup status:", error);
      setError((error as Error).message);
      setHasCompletedSetup(false);
    } finally {
      setIsInitialLoading(false);
    }
  }, [session?.user?.id]);

  // Check if marketplace setup is complete based on required data
  const checkIfSetupComplete = (centerData: any): boolean => {
    // Define the 7 required terms for marketplace completion
    const requirements = [
      centerData.name, // Business name
      centerData.address, // Address
      centerData.description, // About description
      centerData.images && centerData.images.length > 0, // At least one image
      // Opening times - check if at least one day has hours
      centerData.openingHours &&
        Object.keys(centerData.openingHours).some(
          (day) =>
            centerData.openingHours[day] &&
            centerData.openingHours[day].length > 0
        ),
      // Contact info - at least phone or email
      centerData.phone || centerData.email,
      // Category/establishment
      centerData.establishment || centerData.establishmentId,
    ];

    return requirements.every((requirement) => !!requirement);
  };

  // Initialize on mount
  useEffect(() => {
    if (status === "authenticated") {
      checkSetupStatus();
    }
  }, [status, checkSetupStatus]);

  // Handle status change from location header
  const handleStatusChange = (newStatus: boolean) => {
    setLocationStatus(newStatus);
  };

  // Update activation status
  const updateActivationStatus = useCallback(async () => {
    if (!centerId) return;

    try {
      const result = await checkActivationStatus(centerId);
      setLocationStatus(result.isActive);
    } catch (error) {
      console.error("Error updating activation status:", error);
    }
  }, [centerId]);

  // Handle starting marketplace setup
  const handleStartNow = async () => {
    try {
      setIsActionLoading(true);

      // Check if user needs business setup first
      const response = await fetch("/api/user/business-status", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        // If user needs business setup, redirect there first
        if (data.needsSetup) {
          router.push("/business/onboarding");
          return;
        }
      }

      // Go to marketplace setup
      router.push("/marketplace/setup");
    } catch (error) {
      console.error("Error starting setup:", error);
      // Fallback to setup flow anyway
      router.push("/marketplace/setup");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle delete location
  const handleDeleteLocation = async () => {
    if (!location || !centerId) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/marketplace/${centerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete location: ${errorText}`);
      }

      // Reset to setup incomplete state
      setHasCompletedSetup(false);
      setLocation(null);
      setCenterId(null);
    } catch (error) {
      console.error("Error deleting location:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleLearnMore = () => {
    router.push("/about");
  };

  // Loading state
  if (status === "loading" || isInitialLoading) {
    return (
      <>
        <SecondarySidebar
          title="Online Profile"
          items={marketplaceNavItems}
          basePath="/marketplace"
        />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "50vh",
          }}
        >
          <LoadingSpinner />
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <SecondarySidebar
          title="Online Profile"
          items={marketplaceNavItems}
          basePath="/marketplace"
        />
        <div className={marketplaceStyles.container}>
          <div className={marketplaceStyles.content}>
            <h2>Error loading marketplace</h2>
            <p>{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SecondarySidebar
        title="Online Profile"
        items={marketplaceNavItems}
        basePath="/marketplace"
      />

      {/* If setup is complete, show location detail page */}
      {hasCompletedSetup && location ? (
        <div className={detailStyles.pageContainer}>
          <div className={detailStyles.content}>
            <div className={detailStyles.viewLinkContainer}>
              <h1 className={detailStyles.title}>{location.name}</h1>
              <div className={detailStyles.actionButtons}>
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  variant="danger"
                  iconPath="/icons/utility-outline/trash"
                  iconPosition="right"
                >
                  Delete
                </Button>

                <Button
                  onClick={() => router.push(`/locations/${centerId}/view`)}
                  variant="secondary"
                  iconPath="/icons/utility-outline/export"
                  iconPosition="right"
                >
                  View
                </Button>
              </div>
            </div>

            {/* Row 1: Details and Activities */}
            <div className={detailStyles.rowWithActivities}>
              <div className={detailStyles.detailsColumn}>
                <DetailsCard
                  name={location.name}
                  establishment={location.establishment}
                  sports={location.sports}
                  locationId={centerId!}
                />
                <AddressCard
                  address={location.address}
                  latitude={location.latitude}
                  longitude={location.longitude}
                  locationId={centerId!}
                />
              </div>
              <div className={detailStyles.activitiesColumn}>
                <ActivitiesCard
                  locationId={centerId!}
                  activities={location.activities}
                />
              </div>
            </div>

            {/* Row 2: Gallery (Full Width) */}
            <div className={detailStyles.rowFull}>
              <GalleryCard
                images={location.images}
                locationId={centerId!}
                locationName={location.name}
              />
            </div>

            {/* Row 3: About and Opening Times */}
            <div className={detailStyles.rowColumns}>
              <AboutCard
                description={location.description}
                highlights={location.highlights}
                locationId={centerId!}
              />
              <OpeningTimesCard locationId={centerId!} isAdmin={true} />
            </div>

            {/* Row 4: Facilities and Contact */}
            <div className={detailStyles.rowColumns}>
              <FacilitiesCard
                facilities={location.facilities}
                locationId={centerId!}
              />
              <ContactCard
                phone={location.phone}
                email={location.email}
                locationId={centerId!}
              />
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <ConfirmModal
              title="Delete Location"
              message={`Are you sure you want to delete ${location.name}?`}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={handleDeleteLocation}
              onCancel={() => setShowDeleteModal(false)}
              isLoading={isDeleting}
            />
          )}
        </div>
      ) : (
        /* If setup is not complete, show "Go live" page */
        <div className={marketplaceStyles.container}>
          {/* Background Art Layers */}
          <div className={marketplaceStyles.backgroundArt}>
            <img
              src="/images/backgrounds/dots.svg"
              className={marketplaceStyles.dotsPattern}
              alt=""
            />
            <img
              src="/images/backgrounds/lines.svg"
              className={marketplaceStyles.linesPattern}
              alt=""
            />
          </div>

          {/* Main Content */}
          <div className={marketplaceStyles.content}>
            {/* Main Heading */}
            <h1 className={marketplaceStyles.title}>
              Go live on the bord
              <br />
              marketplace today
            </h1>

            {/* Subtitle */}
            <p className={marketplaceStyles.description}>
              Finish setting up your business to create a listing on the
              marketplace.
            </p>

            {/* Action Buttons */}
            <div className={marketplaceStyles.buttonContainer}>
              <Button
                variant="primary-green"
                onClick={handleStartNow}
                className={marketplaceStyles.primaryButton}
                disabled={isActionLoading}
              >
                {isActionLoading ? "Loading..." : "Start Now"}
              </Button>

              <Button
                variant="secondary"
                onClick={handleLearnMore}
                className={marketplaceStyles.secondaryButton}
                disabled={isActionLoading}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
