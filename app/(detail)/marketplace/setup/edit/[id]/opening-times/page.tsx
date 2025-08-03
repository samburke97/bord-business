"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  OpeningHoursData,
  TimeSlot,
  DAYS_OF_WEEK,
  generateTimeOptions,
  getDefaultTimeSlot,
} from "@/types/opening-hours";
import Toast from "@/components/ui/Toast";
import IconButton from "@/components/ui/IconButton";
import SearchDropDown from "@/components/ui/SearchDropDown";
import styles from "./page.module.css";
import ActionHeader from "@/components/layouts/headers/ActionHeader";
import TitleDescription from "@/components/ui/TitleDescription";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface OpeningTimesEditPageProps {
  centerId?: string;
  formData?: any; // TODO: Define proper opening times form data type
  onContinue?: (data: any) => void;
  // Legacy props for standalone edit mode
  params?: Promise<{ id: string }>;
}

export default function OpeningTimesEditPage({
  centerId,
  formData: initialFormData,
  onContinue,
  params,
}: OpeningTimesEditPageProps) {
  // Determine if we're in setup mode (parent manages data) or standalone edit mode
  const isSetupMode = !!centerId && !!onContinue;

  // For standalone mode, we need to get ID from params
  const [standaloneId, setStandaloneId] = useState<string | null>(null);
  const id = isSetupMode ? centerId : standaloneId;

  const router = useRouter();

  // Initialize standalone mode ID
  useEffect(() => {
    if (!isSetupMode && params) {
      const getId = async () => {
        const resolvedParams = await params;
        setStandaloneId(resolvedParams.id);
      };
      getId();
    }
  }, [params, isSetupMode]);

  const [openingHours, setOpeningHours] = useState<OpeningHoursData>({});
  const [loading, setLoading] = useState(!isSetupMode); // Don't show loading in setup mode initially
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const timeOptions = generateTimeOptions();
  const timeSelectOptions = timeOptions.map((time) => ({
    value: time,
    label: time,
  }));

  // Fetch existing data in setup mode to prefill form
  useEffect(() => {
    const fetchExistingData = async () => {
      if (!id || !isSetupMode) return;

      try {
        setIsLoadingData(true);
        const response = await fetch(`/api/locations/${id}/opening-times`);

        if (response.ok) {
          const data = await response.json();
          setOpeningHours(data);
        }
      } catch (error) {
        // Continue with empty form on error
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchExistingData();
  }, [id, isSetupMode]);

  // Fetch opening hours for standalone mode
  useEffect(() => {
    const fetchOpeningHours = async () => {
      if (!id || isSetupMode) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/locations/${id}/opening-times`);

        if (!response.ok) {
          throw new Error("Failed to fetch opening hours");
        }

        const data = await response.json();
        setOpeningHours(data);
      } catch (err) {
        console.error("Error fetching opening hours:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (id && !isSetupMode) {
      fetchOpeningHours();
    }
  }, [id, isSetupMode]);

  // Initialize empty opening hours if none exist
  useEffect(() => {
    if (!loading && !isLoadingData && Object.keys(openingHours).length === 0) {
      const initialOpeningHours: OpeningHoursData = {};

      for (let i = 0; i < 7; i++) {
        // Initialize with empty arrays for all days
        initialOpeningHours[i] = [];
      }

      // Set Monday active by default with one time slot
      initialOpeningHours[0] = [getDefaultTimeSlot()];

      setOpeningHours(initialOpeningHours);
    }
  }, [loading, isLoadingData, openingHours]);

  // Handle continue for setup mode
  const handleContinue = () => {
    if (isSetupMode && onContinue) {
      onContinue({ openingHours });
    }
  };

  // Expose handleContinue to window for header button
  useEffect(() => {
    if (isSetupMode) {
      // @ts-ignore
      window.handleStepContinue = handleContinue;

      return () => {
        // @ts-ignore
        delete window.handleStepContinue;
      };
    }
  }, [openingHours, isSetupMode]);

  // Toggle a day's active status
  const toggleDayActive = (dayIndex: number, isActive: boolean) => {
    setOpeningHours((prev) => {
      const updated = { ...prev };

      if (isActive) {
        // If activating a day, add a single time slot
        updated[dayIndex] = [getDefaultTimeSlot()];
      } else {
        // If deactivating, clear all time slots
        updated[dayIndex] = [];
      }

      // Reset form submitted state when changes are made
      setFormSubmitted(false);

      return updated;
    });
  };

  // Update a time slot
  const updateTimeSlot = (
    dayIndex: number,
    slotIndex: number,
    field: keyof TimeSlot,
    value: any
  ) => {
    setOpeningHours((prev) => {
      const updated = { ...prev };

      if (!updated[dayIndex]) {
        updated[dayIndex] = [];
      }

      if (!updated[dayIndex][slotIndex]) {
        updated[dayIndex][slotIndex] = getDefaultTimeSlot();
      }

      // Store current values before updating
      const currentSlot = updated[dayIndex][slotIndex];

      // Update the specified field
      updated[dayIndex][slotIndex] = {
        ...updated[dayIndex][slotIndex],
        [field]: value,
      };

      // Reset form submitted state when changes are made
      setFormSubmitted(false);

      // If updating the opening time, check if we need to adjust the closing time
      if (field === "openTime") {
        const newOpenTime = value;
        const currentCloseTime = currentSlot.closeTime;

        // If closing time is now earlier than or equal to the new opening time, adjust it
        if (
          timeOptions.indexOf(currentCloseTime) <=
          timeOptions.indexOf(newOpenTime)
        ) {
          const nextAvailableTime = getNextTimeOption(newOpenTime);
          if (nextAvailableTime) {
            updated[dayIndex][slotIndex] = {
              ...updated[dayIndex][slotIndex],
              closeTime: nextAvailableTime,
            };
          }
        }
      }

      // If updating the first slot's close time and there's a second slot,
      // ensure the second slot's open time is after the first slot's close time
      if (
        field === "closeTime" &&
        slotIndex === 0 &&
        updated[dayIndex].length > 1
      ) {
        const firstSlotCloseTime = value;
        const secondSlotOpenTime = updated[dayIndex][1].openTime;

        // If second slot starts before or at the same time first slot ends, adjust it
        if (
          timeOptions.indexOf(secondSlotOpenTime) <=
          timeOptions.indexOf(firstSlotCloseTime)
        ) {
          const nextAvailableTime = getNextTimeOption(firstSlotCloseTime);
          if (nextAvailableTime) {
            updated[dayIndex][1] = {
              ...updated[dayIndex][1],
              openTime: nextAvailableTime,
            };
          }
        }
      }

      return updated;
    });
  };

  // Add a new time slot for a day - limited to maximum 2 slots
  const addTimeSlot = (dayIndex: number) => {
    setOpeningHours((prev) => {
      const updated = { ...prev };

      if (!updated[dayIndex]) {
        updated[dayIndex] = [];
      }

      // Only add a new slot if we're below the maximum of 2 slots
      if (updated[dayIndex].length < 2) {
        // Get the closing time of the first slot
        const firstSlotCloseTime = updated[dayIndex][0]?.closeTime;

        // Create new slot with opening time after first slot's closing time
        const newSlot = {
          ...getDefaultTimeSlot(),
          openTime: getNextTimeOption(firstSlotCloseTime) || "12:00",
        };

        updated[dayIndex] = [...updated[dayIndex], newSlot];
      }

      return updated;
    });
  };

  // Helper function to get the next available time option after a given time
  const getNextTimeOption = (time: string): string | undefined => {
    const index = timeOptions.findIndex((t) => t === time);
    if (index >= 0 && index < timeOptions.length - 1) {
      return timeOptions[index + 1];
    }
    return undefined;
  };

  // Remove a time slot
  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setOpeningHours((prev) => {
      const updated = { ...prev };

      if (updated[dayIndex] && updated[dayIndex].length > slotIndex) {
        // Create a new array without the removed slot
        const newDaySlots = [...updated[dayIndex]];
        newDaySlots.splice(slotIndex, 1);
        updated[dayIndex] = newDaySlots;

        // If we removed the last slot, deactivate the day
        if (updated[dayIndex].length === 0) {
          // Keep the empty array to show "Closed"
        }
      }

      return updated;
    });
  };

  // Check if a day has any active time slots
  const isDayActive = (dayIndex: number): boolean => {
    return openingHours[dayIndex] && openingHours[dayIndex].length > 0;
  };

  // Validate all opening hours
  const validateOpeningHours = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    Object.entries(openingHours).forEach(([dayIndexStr, slots]) => {
      const dayIndex = parseInt(dayIndexStr);
      const dayName = DAYS_OF_WEEK[dayIndex];

      slots.forEach((slot: TimeSlot, slotIndex: number) => {
        if (hasTimeSlotError(dayIndex, slotIndex, slot)) {
          errors.push(
            `${dayName}: Opening time (${slot.openTime}) must be earlier than closing time (${slot.closeTime})`
          );
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Check if a specific time slot is valid (opening before closing)
  const isValidTimeSlot = (slot: TimeSlot): boolean => {
    const openTimeIndex = timeOptions.indexOf(slot.openTime);
    const closeTimeIndex = timeOptions.indexOf(slot.closeTime);
    return openTimeIndex < closeTimeIndex;
  };

  // Check if a specific time slot has an error (opening time not before closing time)
  const hasTimeSlotError = (
    dayIndex: number,
    slotIndex: number,
    slot: TimeSlot
  ): boolean => {
    const openTimeIndex = timeOptions.indexOf(slot.openTime);
    const closeTimeIndex = timeOptions.indexOf(slot.closeTime);
    return openTimeIndex >= closeTimeIndex;
  };

  // Save opening hours (for standalone mode)
  const handleSave = async () => {
    if (!id || saving || isSetupMode) return;

    // Set form submitted to trigger error states
    setFormSubmitted(true);

    try {
      const validation = validateOpeningHours();

      if (!validation.isValid) {
        setToast({
          visible: true,
          message: `Invalid opening hours: ${validation.errors[0]}`,
          type: "error",
        });
        return;
      }

      setSaving(true);

      const response = await fetch(`/api/locations/${id}/opening-times`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ openingHours }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save opening times");
      }

      setToast({
        visible: true,
        message: "Opening times saved successfully",
        type: "success",
      });

      // Navigate back to the location detail page after a brief delay
      setTimeout(() => {
        router.push(`/locations/${id}`);
      }, 1500);
    } catch (err) {
      console.error("Error saving opening hours:", err);
      setToast({
        visible: true,
        message: (err as Error).message,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle close button click (for standalone mode)
  const handleClose = () => {
    if (!isSetupMode) {
      router.push(`/locations/${id}`);
    }
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Don't render until we have an ID
  if (!id) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching existing data in setup mode
  if (isSetupMode && isLoadingData) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <p>Loading existing data...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {/* Only show ActionHeader in standalone edit mode */}
      {!isSetupMode && (
        <ActionHeader
          primaryAction={handleSave}
          secondaryAction={handleClose}
          primaryLabel="Save"
          secondaryLabel="Close"
          variant="edit"
        />
      )}

      <div className={styles.container}>
        <TitleDescription
          title="Opening Times"
          description="Please add and review your details before continuing."
        />

        <div className={styles.openingHoursForm}>
          {DAYS_OF_WEEK.map((day, dayIndex) => (
            <div key={day} className={styles.dayRow}>
              <div className={styles.dayContent}>
                <div className={styles.dayCheckContainer}>
                  <label className={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      checked={isDayActive(dayIndex)}
                      onChange={(e) =>
                        toggleDayActive(dayIndex, e.target.checked)
                      }
                      className={styles.checkbox}
                    />
                    <span className={styles.checkmark}></span>
                    <span className={styles.dayName}>{day}</span>
                  </label>
                </div>

                <div className={styles.timeSlots}>
                  {isDayActive(dayIndex) ? (
                    openingHours[dayIndex].map((slot, slotIndex) => {
                      // Filter open time options
                      const openTimeOptions =
                        slotIndex === 0
                          ? timeSelectOptions
                          : timeSelectOptions.filter(
                              (time) =>
                                timeOptions.indexOf(time.value) >
                                timeOptions.indexOf(
                                  openingHours[dayIndex][0].closeTime
                                )
                            );

                      // Filter close time options based on open time
                      const closeTimeOptions = timeSelectOptions.filter(
                        (time) =>
                          timeOptions.indexOf(time.value) >
                          timeOptions.indexOf(slot.openTime)
                      );

                      // Determine error for the time slot
                      const timeSlotError =
                        formSubmitted &&
                        hasTimeSlotError(dayIndex, slotIndex, slot)
                          ? "Opening time must be earlier than closing time"
                          : null;

                      return (
                        <div key={slotIndex} className={styles.timeSlotRow}>
                          <div className={styles.timeSelectGroup}>
                            <SearchDropDown
                              value={slot.openTime}
                              onChange={(value) =>
                                updateTimeSlot(
                                  dayIndex,
                                  slotIndex,
                                  "openTime",
                                  value
                                )
                              }
                              options={openTimeOptions}
                              placeholder="Open"
                              className={styles.timeSelect}
                              error={timeSlotError}
                              showClearButton={false}
                            />

                            <span className={styles.timeSeparator}>-</span>

                            <SearchDropDown
                              value={slot.closeTime}
                              onChange={(value) =>
                                updateTimeSlot(
                                  dayIndex,
                                  slotIndex,
                                  "closeTime",
                                  value
                                )
                              }
                              options={closeTimeOptions}
                              placeholder="Close"
                              className={styles.timeSelect}
                              error={timeSlotError}
                              allowFreeInput={false}
                              showClearButton={false}
                            />
                          </div>

                          <div className={styles.buttonContainer}>
                            {openingHours[dayIndex].length === 1 ? (
                              <IconButton
                                icon={
                                  <img
                                    src="/icons/utility-outline/plus.svg"
                                    alt="Add time slot"
                                    width={16}
                                    height={16}
                                  />
                                }
                                onClick={() => addTimeSlot(dayIndex)}
                                variant="ghost"
                                aria-label="Add time slot"
                                className={styles.timeSlotButton}
                              />
                            ) : (
                              <IconButton
                                icon={
                                  <img
                                    src="/icons/utility-outline/cross.svg"
                                    alt="Remove time slot"
                                    width={16}
                                    height={16}
                                  />
                                }
                                onClick={() =>
                                  removeTimeSlot(dayIndex, slotIndex)
                                }
                                variant="ghost"
                                aria-label="Remove time slot"
                                className={styles.timeSlotButton}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.closed}>
                      <div className={styles.closedText}>Closed</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {toast.visible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
          />
        )}
      </div>
    </>
  );
}
