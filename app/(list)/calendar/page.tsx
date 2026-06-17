// app/(detail)/calendar/[id]/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import styles from "./page.module.css";

type ViewMode = "Day" | "3 Days" | "Week" | "Month";

export default function CalendarDetailPage() {
  const params = useParams();
  const [viewMode, setViewMode] = useState<ViewMode>("Day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case "Day":
        newDate.setDate(newDate.getDate() - 1);
        break;
      case "3 Days":
        newDate.setDate(newDate.getDate() - 3);
        break;
      case "Week":
        newDate.setDate(newDate.getDate() - 7);
        break;
      case "Month":
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case "Day":
        newDate.setDate(newDate.getDate() + 1);
        break;
      case "3 Days":
        newDate.setDate(newDate.getDate() + 3);
        break;
      case "Week":
        newDate.setDate(newDate.getDate() + 7);
        break;
      case "Month":
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleRefresh = () => {
    console.log("Refresh calendar");
  };

  const handleAddEvent = () => {
    console.log("Add new booking");
  };

  const handleSettings = () => {
    console.log("Open settings");
  };

  // Get date range text based on view mode
  const getDateRangeText = () => {
    switch (viewMode) {
      case "Day":
        return "8/21/2025";
      case "3 Days": {
        const start = new Date(currentDate);
        const end = new Date(currentDate);
        end.setDate(start.getDate() + 2);
        return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}/${start.getFullYear()}`;
      }
      case "Week": {
        const start = new Date(currentDate);
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek + 1); // Monday
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Sunday
        return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}/${start.getFullYear()}`;
      }
      case "Month":
        return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);
      default:
        return "8/21/2025";
    }
  };

  // Get view icon based on current view mode
  const getViewIcon = () => {
    switch (viewMode) {
      case "Day":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      case "Week":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      case "Month":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 14h8M8 18h8" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
    }
  };

  const renderWeekView = () => {
    // Generate 24 hours (full day)
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const hour12 = i === 0 ? 12 : i <= 12 ? i : i - 12;
      const ampm = i < 12 ? 'am' : 'pm';
      hours.push({
        time24: i,
        display: `${hour12}:00`,
        ampm: ampm
      });
    }

    // Generate week days
    const weekDays = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const isToday = day.toDateString() === new Date().toDateString();
      
      weekDays.push({
        date: day,
        number: day.getDate().toString(),
        name: day.toLocaleDateString('en-US', { weekday: 'long' }),
        isToday: isToday
      });
    }

    return (
      <div className={styles.weekView}>
        {/* Week header with days */}
        <div className={styles.weekHeader}>
          <div className={styles.timeHeaderCell}></div>
          {weekDays.map((day, index) => (
            <div key={index} className={styles.weekDayHeader}>
              <div className={`${styles.weekDayNumber} ${day.isToday ? styles.today : ''}`}>
                {day.number}
              </div>
              <div className={styles.weekDayName}>{day.name}</div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className={styles.timeGrid}>
          {hours.map((hour) => (
            <div key={hour.time24} className={styles.timeRow}>
              <div className={styles.timeCell}>
                <span className={styles.timeLabel}>{hour.display}</span>
                <span className={styles.timeUnit}>{hour.ampm}</span>
              </div>
              {weekDays.map((_, dayIndex) => (
                <div key={dayIndex} className={styles.gridCell}></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };
    // Generate 24 hours (full day)
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const hour12 = i === 0 ? 12 : i <= 12 ? i : i - 12;
      const ampm = i < 12 ? 'am' : 'pm';
      hours.push({
        time24: i,
        display: `${hour12}:00`,
        ampm: ampm
      });
    }

    return (
      <div className={styles.dayView}>
        {/* Day header */}
        <div className={styles.dayHeader}>
          <div className={styles.dayHeaderCell}>
            <div className={styles.dayNumber}>21</div>
            <div className={styles.dayName}>Climbing Gym</div>
          </div>
      <div className={styles.calendarContainer}>
        {viewMode === "Month" && renderMonthView()}
        {viewMode === "Week" && renderWeekView()}
        {viewMode === "Day" && renderDayView()}
        {(viewMode === "3 Days") && renderDayView()} {/* Temporary - will add 3-day view later */}
      </div>

  const renderMonthView = () => {
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    // Generate calendar dates
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() + 6) % 7); // Start from Monday
    
    const dates = [];
    const current = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDates = [];
      for (let day = 0; day < 7; day++) {
        weekDates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      dates.push(weekDates);
      if (current > lastDay && current.getDay() === 1) break;
    }

    return (
      <div className={styles.monthView}>
        <div className={styles.weekHeaders}>
          {weekdays.map((day) => (
            <div key={day} className={styles.weekHeader}>
              {day}
            </div>
          ))}
        </div>
        
        <div className={styles.monthGrid}>
          {dates.map((week, weekIndex) =>
            week.map((date, dayIndex) => {
              const isCurrentMonth = date.getMonth() === month;
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div 
                  key={`${weekIndex}-${dayIndex}`} 
                  className={`${styles.monthCell} ${!isCurrentMonth ? styles.otherMonth : ''}`}
                >
                  <div className={`${styles.dateNumber} ${isToday ? styles.today : ''}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {/* Refresh Button */}
          <IconButton
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 16l-5 5v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            onClick={handleRefresh}
            variant="ghost"
          />

          {/* View Mode Button with dropdown */}
          <div className={styles.viewModeContainer}>
            <button 
              className={styles.viewModeButton}
              onClick={() => setShowViewDropdown(!showViewDropdown)}
            >
              {getViewIcon()}
              {viewMode}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            
            {showViewDropdown && (
              <div className={styles.viewModeMenu}>
                {(["Day", "3 Days", "Week", "Month"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`${styles.viewModeMenuItem} ${viewMode === mode ? styles.active : ''}`}
                    onClick={() => {
                      setViewMode(mode);
                      setShowViewDropdown(false);
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center - Date Navigation */}
        <div className={styles.headerCenter}>
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
          <span className={styles.dateRange}>{getDateRangeText()}</span>
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

        {/* Right - Actions */}
        <div className={styles.headerRight}>
          {/* Climbing Gym Button */}
          <Button variant="secondary" className={styles.facilityButton}>
            Climbing Gym
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

          {/* Add Button */}
          <Button onClick={handleAddEvent} className={styles.addButton}>
            Add
          </Button>

          {/* Settings Button */}
          <IconButton
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            }
            onClick={handleSettings}
            variant="ghost"
          />
        </div>
      </div>

      {/* Calendar Container - flush to edges */}
  const renderDayView = () => {
    // Generate 24 hours (full day)
    const hours = [];
    for (let i = 0; i < 24; i++) {
      const hour12 = i === 0 ? 12 : i <= 12 ? i : i - 12;
      const ampm = i < 12 ? 'am' : 'pm';
      hours.push({
        time24: i,
        display: `${hour12}:00`,
        ampm: ampm
      });
    }

    return (
      <div className={styles.dayView}>
        {/* Day header */}
        <div className={styles.dayHeader}>
          <div className={styles.dayHeaderCell}>
            <div className={styles.dayNumber}>21</div>
            <div className={styles.dayName}>Climbing Gym</div>
          </div>
        </div>

        {/* Time grid */}
        <div className={styles.timeGrid}>
          {hours.map((hour) => (
            <div key={hour.time24} className={styles.timeRow}>
              <div className={styles.timeCell}>
                <span className={styles.timeLabel}>{hour.display}</span>
                <span className={styles.timeUnit}>{hour.ampm}</span>
              </div>
              <div className={styles.gridCell}></div>
            </div>
          ))}
        </div>
      </div>
    );
  };
    </div>
  );
}