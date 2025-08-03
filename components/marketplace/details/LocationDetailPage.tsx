"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import DetailsCard from "./cards/DetailsCard";
import AddressCard from "./cards/AddressCard";
import GalleryCard from "./cards/GalleryCard";
import AboutCard from "./cards/AboutCard";
import OpeningTimesCard from "./cards/OpeningTimesCard";
import FacilitiesCard from "./cards/FacilitiesCard";
import ContactCard from "./cards/ContactCard";
import ActivitiesCard from "./cards/ActvitiesCard";
import ConfirmModal from "@/components/modals/ConfirmModal";
import { checkActivationStatus } from "@/lib/services/locationEditService";
import styles from "./LocationDetailPage.module.css";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

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

interface LocationDetailPageProps {
  params: {
    id: string;
  };
}

export default function LocationDetailPage({
  params,
}: LocationDetailPageProps) {
  const { id } = params;
  const router = useRouter();
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<boolean>(false);

  const updateActivationStatus = useCallback(async () => {
    if (!id) return;

    try {
      const result = await checkActivationStatus(id);
      setLocationStatus(result.isActive);
    } catch (error) {
      console.error("Error updating activation status:", error);
    }
  }, [id]);

  // Handle status change from location header
  const handleStatusChange = (newStatus: boolean) => {
    setLocationStatus(newStatus);
  };

  useEffect(() => {
    const fetchLocationDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Updated: Use marketplace API endpoint instead of locations
        const apiUrl = `/api/marketplace/${id}`;

        const response = await fetch(apiUrl);

        const responseText = await response.text();

        // Try to parse the response if it's not empty
        if (!responseText) {
          throw new Error("Empty response from API");
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse response as JSON:", e);
          throw new Error("Invalid response format from server");
        }

        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch location details");
        }

        setLocation(data);
        setLocationStatus(data.isActive);
        updateActivationStatus();
      } catch (error) {
        console.error("Error fetching location details:", error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchLocationDetail();
    } else {
      console.error("No location ID provided");
      setError("No location ID provided");
      setIsLoading(false);
    }
  }, [id, updateActivationStatus]);

  // Also update the delete endpoint:
  const handleDeleteLocation = async () => {
    if (!location) return;

    try {
      setIsDeleting(true);

      // Updated: Use marketplace API endpoint for deletion as well
      const response = await fetch(`/api/marketplace/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete location: ${errorText}`);
      }

      // Redirect to marketplace page after successful deletion
      router.push("/marketplace");
    } catch (error) {
      console.error("Error deleting location:", error);
      // You could show an error toast or message here
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !location) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error loading location</h2>
        <p>{error || "Location not found"}</p>
        <div className={styles.errorDetails}>
          <p>Location ID: {id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.content}>
        <div className={styles.viewLinkContainer}>
          <h1 className={styles.title}>{location.name}</h1>
          <div className={styles.actionButtons}>
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="danger"
              iconPath="/icons/utility-outline/trash"
              iconPosition="right"
            >
              Delete
            </Button>

            <Button
              onClick={() => router.push(`/locations/${id}/view`)}
              variant="secondary"
              iconPath="/icons/utility-outline/export"
              iconPosition="right"
            >
              View
            </Button>
          </div>
        </div>

        {/* Row 1: Details and Activities */}
        <div className={styles.rowWithActivities}>
          <div className={styles.detailsColumn}>
            <DetailsCard
              name={location.name}
              establishment={location.establishment}
              sports={location.sports}
              locationId={id}
            />
            <AddressCard
              address={location.address}
              latitude={location.latitude}
              longitude={location.longitude}
              locationId={id}
            />
          </div>
          <div className={styles.activitiesColumn}>
            <ActivitiesCard locationId={id} activities={location.activities} />
          </div>
        </div>

        {/* Row 2: Gallery (Full Width) */}
        <div className={styles.rowFull}>
          <GalleryCard
            images={location.images}
            locationId={id}
            locationName={location.name}
          />
        </div>

        {/* Row 3: About and Opening Times */}
        <div className={styles.rowColumns}>
          <AboutCard
            description={location.description}
            highlights={location.highlights}
            locationId={id}
          />
          <OpeningTimesCard locationId={id} isAdmin={true} />
        </div>

        {/* Row 4: Facilities and Contact */}
        <div className={styles.rowColumns}>
          <FacilitiesCard facilities={location.facilities} locationId={id} />
          <ContactCard
            phone={location.phone}
            email={location.email}
            locationId={id}
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
  );
}
