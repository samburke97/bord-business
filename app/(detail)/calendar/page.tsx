// app/(detail)/calendar/[id]/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import styles from "./page.module.css";

type ViewMode = "month" | "week" | "3day" | "day";

interface Bay {
  id: number;
  name: string;
}

const bays: Bay[] = [
  { id: 1, name: "Bay 1" },
  { id: 2, name: "Bay 2" },
  { id: 3, name: "Bay 3" },
  { id: 4, name: "Bay 4" },
  { id: 5, name: "Bay 5" },
  { id: 6, name: "Bay 6" },
  { id: 7, name: "Bay 7" },
];

const timeSlots = [
  "7:00",
  "8:00",
  "9:00",
  "10:00",
  "11:00",
  "12:00",
  "1:00",
  "2:00",
];

// Generate current week dates
const getCurrentWeekDates = () => {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - currentDay + 1);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const formatDateRange = (dates: Date[]) => {
  const start = dates[0];
  const end = dates[dates.length - 1];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (start.getMonth() === end.getMonth()) {
    return `${months[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
  } else {
    return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}`;
  }
};

export default function CalendarDetailPage() {
  const params = useParams();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentWeekDates] = useState<Date[]>(getCurrentWeekDates());
  const [selectedRange] = useState<string>(formatDateRange(currentWeekDates));

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handlePrevious = () => {
    console.log("Previous period");
  };

  const handleNext = () => {
    console.log("Next period");
  };

  const handleAddEvent = () => {
    console.log("Add new booking");
  };

  const renderWeekView = () => {
    return (
      <div className={styles.weekView}>
        <div className={styles.timeColumn}>
          <div className={styles.timeHeaderCell}></div>
          {timeSlots.map((time) => (
            <div key={time} className={styles.timeCell}>
              <span className={styles.timeLabel}>{time}</span>
              <span className={styles.timeUnit}>am</span>
            </div>
          ))}
        </div>

        {bays.map((bay) => (
          <div key={bay.id} className={styles.bayColumn}>
            <div className={styles.bayHeader}>
              <div className={styles.bayIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className={styles.bayName}>{bay.name}</span>
            </div>

            <div className={styles.bayTimeSlots}>
              {timeSlots.map((time) => (
                <div key={time} className={styles.timeSlot}>
                  {/* Empty slots for bookings */}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Classes</h1>
            <div className={styles.dateNavigation}>
              <IconButton
                icon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8L10 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                onClick={handlePrevious}
                variant="ghost"
                size="sm"
              />
              <span className={styles.dateRange}>Sat 26 - Sun 28 July</span>
              <IconButton
                icon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 4L10 8L6 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                onClick={handleNext}
                variant="ghost"
                size="sm"
              />
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* View Mode Selector */}
            <div className={styles.viewModeSelector}>
              <button
                onClick={() => handleViewModeChange("day")}
                className={`${styles.viewModeButton} ${viewMode === "day" ? styles.active : ""}`}
              >
                Day
              </button>
              <button
                onClick={() => handleViewModeChange("3day")}
                className={`${styles.viewModeButton} ${viewMode === "3day" ? styles.active : ""}`}
              >
                3 Day
              </button>
              <button
                onClick={() => handleViewModeChange("week")}
                className={`${styles.viewModeButton} ${viewMode === "week" ? styles.active : ""}`}
              >
                Week
              </button>
              <button
                onClick={() => handleViewModeChange("month")}
                className={`${styles.viewModeButton} ${viewMode === "month" ? styles.active : ""}`}
              >
                Month
              </button>
            </div>

            <div className={styles.headerActions}>
              <Button variant="secondary" className={styles.drivingRangeButton}>
                <span>Driving Range</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>

              <Button onClick={handleAddEvent} className={styles.addButton}>
                Add
              </Button>

              <IconButton
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                }
                variant="ghost"
              />
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className={styles.calendarContainer}>
          {viewMode === "week" && renderWeekView()}
          {viewMode === "month" && (
            <div className={styles.placeholder}>Month view coming soon...</div>
          )}
          {viewMode === "3day" && (
            <div className={styles.placeholder}>3-day view coming soon...</div>
          )}
          {viewMode === "day" && (
            <div className={styles.placeholder}>Day view coming soon...</div>
          )}
        </div>
      </div>
    </div>
  );
}
