// app/(list)/calendar/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import TitleDescription from "@/components/ui/TitleDescription";
import styles from "./page.module.css";

interface CalendarListItem {
  id: string;
  name: string;
  location: string;
  lastModified: string;
  status: "active" | "inactive";
}

// Mock data - replace with real data later
const mockCalendars: CalendarListItem[] = [
  {
    id: "1",
    name: "Main Driving Range",
    location: "Bay Area Sports Complex",
    lastModified: "2024-01-15",
    status: "active",
  },
  {
    id: "2",
    name: "Practice Range",
    location: "Downtown Golf Center",
    lastModified: "2024-01-12",
    status: "active",
  },
];

export default function CalendarListPage() {
  const router = useRouter();
  const [calendars] = useState<CalendarListItem[]>(mockCalendars);

  const handleCalendarClick = (calendarId: string) => {
    router.push(`/(detail)/calendar/${calendarId}`);
  };

  const handleCreateNew = () => {
    // Future: Handle creating new calendar
    console.log("Create new calendar");
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <TitleDescription
            title="Calendars"
            description="Manage your driving range bay schedules and bookings"
          />
          <Button onClick={handleCreateNew} className={styles.createButton}>
            New Calendar
          </Button>
        </div>

        {/* Calendar List */}
        <div className={styles.calendarGrid}>
          {calendars.map((calendar) => (
            <div
              key={calendar.id}
              className={styles.calendarCard}
              onClick={() => handleCalendarClick(calendar.id)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M8 2V5M16 2V5M3.5 9.5H20.5M4 18V7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className={styles.statusBadge}>
                  <span
                    className={`${styles.statusDot} ${styles[calendar.status]}`}
                  />
                  {calendar.status}
                </div>
              </div>

              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{calendar.name}</h3>
                <p className={styles.cardLocation}>{calendar.location}</p>
                <p className={styles.cardMeta}>
                  Last updated: {calendar.lastModified}
                </p>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.viewText}>View Calendar</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {calendars.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 2V5M16 2V5M3.5 9.5H20.5M4 18V7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <TitleDescription
              title="No calendars found"
              description="Create your first calendar to start managing bay bookings"
              variant="center"
            />
            <Button
              onClick={handleCreateNew}
              className={styles.emptyStateButton}
            >
              Create Calendar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
