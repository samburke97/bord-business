"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import DataTable, { Column } from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";
import TitleDescription from "@/components/ui/TitleDescription";

interface ActivityPricing {
  id: string;
  playerType: string;
  duration: string | null;
  priceType: string;
  price: number | string;
}

interface Activity {
  id: string;
  title: string;
  imageUrl?: string | null;
  activityType?: {
    id: string;
    name: string;
  } | null;
  pricingVariants: ActivityPricing[];
}

interface ActivitiesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ActivitiesPage({ params }: ActivitiesPageProps) {
  const resolvedParams = use(params);
  const locationId = resolvedParams.id;
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/locations/${locationId}/activities${
            searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : ""
          }`
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch activities: ${errorText}`);
        }

        const data = await response.json();
        setActivities(data);
        setFilteredActivities(data);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [locationId, searchQuery]);

  const getActivityUrl = (activity: Activity) => {
    return `/locations/edit/${locationId}/activities/${activity.id}`;
  };

  const handleCreateActivity = () => {
    router.push(`/locations/edit/${locationId}/activities/create`);
  };

  const handleGoBack = () => {
    router.push(`/locations/${locationId}`);
  };

  // Updated format price function to handle string or number values
  const formatPrice = (activity: Activity): string => {
    if (!activity.pricingVariants || activity.pricingVariants.length === 0) {
      return "-";
    }

    const sortedPrices = [...activity.pricingVariants].sort((a, b) => {
      const priceA =
        typeof a.price === "string" ? parseFloat(a.price) : a.price;
      const priceB =
        typeof b.price === "string" ? parseFloat(b.price) : b.price;
      return priceA - priceB;
    });

    const lowestPrice = sortedPrices[0];

    // Safely get the numerical price value
    const priceValue =
      typeof lowestPrice.price === "string"
        ? parseFloat(lowestPrice.price)
        : lowestPrice.price;

    // Format based on price type string
    const priceType = lowestPrice.priceType?.toUpperCase() || "";

    if (priceType === "FREE") {
      return "Free";
    } else if (priceType === "FROM") {
      return `from $${priceValue.toFixed(2)}`;
    } else if (priceType === "VARIABLE") {
      return `from $${priceValue.toFixed(2)}`;
    } else {
      // Default to FIXED
      return `$${priceValue.toFixed(2)}`;
    }
  };

  const columns: Column<Activity>[] = [
    {
      key: "title",
      header: "Activity Name",
      render: (row) => (
        <Link href={getActivityUrl(row)} className={styles.activityLink}>
          <div className={styles.activityNameCell}>
            <div className={styles.iconContainer}>
              {row.imageUrl ? (
                <Image
                  src={row.imageUrl}
                  width={20}
                  height={20}
                  alt={row.title}
                  className={styles.activityImage}
                  priority={true}
                />
              ) : (
                <Image
                  src="/icons/utility-outline/add-image.svg"
                  width={20}
                  height={20}
                  alt="Activity icon"
                  priority={true}
                />
              )}
            </div>
            <span>{row.title}</span>
          </div>
        </Link>
      ),
    },
    {
      key: "activityType",
      header: "Type",
      render: (row) => <span>{row.activityType?.name || "-"}</span>,
    },
    {
      key: "price",
      header: "Price",
      width: "150px",
      render: (row) => <span>{formatPrice(row)}</span>,
    },
  ];

  return (
    <>
      <ActionHeader
        primaryAction={handleCreateActivity}
        secondaryAction={handleGoBack}
        primaryLabel="Create"
        secondaryLabel="Back"
        type="back"
      />
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          <div className={styles.headerContainer}>
            <TitleDescription title={"Activities"} />
            <Button variant="primary" size="md" onClick={handleCreateActivity}>
              Create New
            </Button>
          </div>

          {filteredActivities.length === 0 && !isLoading ? (
            <EmptyState
              message="No activities found for this location."
              createNewLink={`/locations/edit/${locationId}/activities/create`}
              createNewLabel="Create Activity"
            />
          ) : (
            <DataTable
              columns={columns}
              data={filteredActivities}
              keyField="id"
              isLoading={isLoading}
              itemType="activity"
            />
          )}
        </div>
      </div>
    </>
  );
}
