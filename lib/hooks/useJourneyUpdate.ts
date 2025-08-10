// lib/hooks/useJourneyUpdate.ts - COMPLETE WITH SESSION INTEGRATION
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useCallback, useRef } from "react";
import {
  UserJourneyState,
  OnboardingStep,
  BusinessIntention,
} from "@/lib/services/UserJourneyService";

interface JourneyUpdateOptions {
  optimisticUpdate?: boolean;
  skipSessionRefresh?: boolean;
  retryAttempts?: number;
}

interface UpdateResult {
  success: boolean;
  data?: any;
  error?: string;
  fromCache?: boolean;
}

export function useJourneyUpdate() {
  const { data: session, update: updateSession } = useSession();
  const isUpdatingRef = useRef(false);
  const pendingUpdatesRef = useRef<any[]>([]);

  /**
   * ✅ Listen for server-triggered session updates
   */
  useEffect(() => {
    const handleSessionUpdate = async (event: CustomEvent) => {
      const { userId, cacheData } = event.detail;

      // Only process if it's for the current user
      if (session?.user?.id === userId && !isUpdatingRef.current) {
        try {
          isUpdatingRef.current = true;
          await updateSession(cacheData);
          console.log(`Session updated from server event for user ${userId}`);
        } catch (error) {
          console.warn("Failed to update session from server event:", error);
        } finally {
          isUpdatingRef.current = false;
        }
      }
    };

    // ✅ Listen for server-side session update events
    if (typeof window !== "undefined") {
      window.addEventListener(
        "journey-session-update",
        handleSessionUpdate as unknown as EventListener
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "journey-session-update",
          handleSessionUpdate as unknown as EventListener
        );
      }
    };
  }, [session?.user?.id, updateSession]);

  /**
   * ✅ Enhanced journey update with complete session integration
   */
  const updateJourney = useCallback(
    async (
      changes: Partial<UserJourneyState>,
      options: JourneyUpdateOptions = {}
    ): Promise<UpdateResult> => {
      const {
        optimisticUpdate = true,
        skipSessionRefresh = false,
        retryAttempts = 3,
      } = options;

      // Prevent concurrent updates
      if (isUpdatingRef.current) {
        pendingUpdatesRef.current.push({ changes, options });
        return {
          success: false,
          error: "Update in progress, queued for later",
        };
      }

      try {
        isUpdatingRef.current = true;

        // ✅ Optimistic update: Update session immediately for better UX
        if (optimisticUpdate && !skipSessionRefresh) {
          const optimisticData = {
            // Journey state fields
            hasViewedSuccess: changes.hasViewedSuccess,
            businessIntention: changes.businessIntention,
            onboardingStep: changes.onboardingStep,

            // Profile completion tracking
            isProfileComplete: changes.isProfileComplete,
            profileCompletedAt: changes.profileCompletedAt?.toISOString(),

            // Email verification tracking
            emailVerifiedAt: changes.emailVerifiedAt?.toISOString(),

            // Business connection status
            hasBusinessConnection: changes.hasBusinessConnection,

            // Timing fields
            intentionSetAt: changes.intentionSetAt?.toISOString(),

            // Cache refresh timestamp
            lastJourneyRefresh: new Date().toISOString(),
          };

          await updateSession(optimisticData);
        }

        // ✅ Prepare request body with proper field mapping
        const requestBody = {
          // Map currentStep to step for API compatibility
          step: changes.currentStep,
          intention: changes.intention,
          hasViewedSuccess: changes.hasViewedSuccess,
          // onboardingData: changes.onboardingData, // Removed - not part of UserJourneyState

          // Convert dates to ISO strings for JSON serialization
          emailVerifiedAt: changes.emailVerifiedAt?.toISOString(),
          profileCompletedAt: changes.profileCompletedAt?.toISOString(),

          // Additional fields
          isProfileComplete: changes.isProfileComplete,
          hasBusinessConnection: changes.hasBusinessConnection,

          // Metadata for tracking
          _metadata: {
            optimisticUpdate,
            timestamp: new Date().toISOString(),
          },
        };

        // ✅ Make the API call with retry logic
        let lastError: Error | null = null;
        let response: Response | null = null;

        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
          try {
            response = await fetch("/api/user/journey", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Journey-Update": "true", // Custom header for tracking
              },
              body: JSON.stringify({
                ...requestBody,
                _metadata: {
                  ...requestBody._metadata,
                  attempt,
                },
              }),
            });

            if (response.ok) {
              break; // Success!
            }

            // Handle specific error cases
            if (response.status === 429) {
              // Rate limited - wait before retry
              await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, attempt) * 1000)
              );
              continue;
            }

            if (response.status >= 500) {
              // Server error - retry
              lastError = new Error(`Server error: ${response.status}`);
              continue;
            }

            // Client error - don't retry
            throw new Error(`Client error: ${response.status}`);
          } catch (error) {
            lastError = error as Error;
            if (attempt === retryAttempts) {
              throw lastError;
            }
            // Wait before retry
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 500)
            );
          }
        }

        if (!response || !response.ok) {
          throw (
            lastError || new Error("Failed to update journey after retries")
          );
        }

        const result = await response.json();

        // ✅ Server returned fresh data - update session with authoritative data
        if (!skipSessionRefresh && result.sessionData) {
          await updateSession({
            ...result.sessionData,
            lastJourneyRefresh: new Date().toISOString(),
          });
        }

        console.log(`Journey update successful:`, {
          changes: Object.keys(changes),
          optimistic: optimisticUpdate,
          attempts: response.headers.get("X-Attempt-Count") || "1",
        });

        return {
          success: true,
          data: result,
          fromCache: false,
        };
      } catch (error) {
        console.error("Journey update failed:", error);

        // ✅ Rollback optimistic update on failure
        if (optimisticUpdate && !skipSessionRefresh) {
          try {
            // Trigger a fresh session fetch to rollback optimistic changes
            await updateSession({});
          } catch (rollbackError) {
            console.warn(
              "Failed to rollback optimistic update:",
              rollbackError
            );
          }
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          fromCache: false,
        };
      } finally {
        isUpdatingRef.current = false;

        // ✅ Process any pending updates
        if (pendingUpdatesRef.current.length > 0) {
          const nextUpdate = pendingUpdatesRef.current.shift();
          if (nextUpdate) {
            // Process next update after a brief delay
            setTimeout(() => {
              updateJourney(nextUpdate.changes, nextUpdate.options);
            }, 100);
          }
        }
      }
    },
    [session?.user?.id, updateSession]
  );

  /**
   * ✅ Enhanced batch update for multiple changes
   */
  const batchUpdateJourney = useCallback(
    async (
      updates: Array<Partial<UserJourneyState>>,
      options: JourneyUpdateOptions = {}
    ): Promise<UpdateResult> => {
      // Merge all updates into a single change set
      const mergedChanges = updates.reduce(
        (acc, update) => ({
          ...acc,
          ...update,
        }),
        {}
      );

      return updateJourney(mergedChanges, {
        ...options,
        optimisticUpdate: false, // Disable optimistic updates for batch operations
      });
    },
    [updateJourney]
  );

  /**
   * ✅ Force refresh journey data from server
   */
  const refreshJourney = useCallback(async (): Promise<UpdateResult> => {
    try {
      const response = await fetch("/api/user/journey", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Force-Refresh": "true",
        },
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const result = await response.json();

      // Update session with fresh data
      if (result.sessionData) {
        await updateSession(result.sessionData);
      }

      return {
        success: true,
        data: result,
        fromCache: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Refresh failed",
      };
    }
  }, [updateSession]);

  /**
   * ✅ Quick update helpers for common operations
   */
  const updateStep = useCallback(
    (step: OnboardingStep) => updateJourney({ currentStep: step }),
    [updateJourney]
  );

  const updateIntention = useCallback(
    (intention: BusinessIntention) => updateJourney({ intention }),
    [updateJourney]
  );

  const markSuccessViewed = useCallback(
    () => updateJourney({ hasViewedSuccess: true }),
    [updateJourney]
  );

  const markProfileComplete = useCallback(
    () =>
      updateJourney({
        isProfileComplete: true,
        profileCompletedAt: new Date(),
      }),
    [updateJourney]
  );

  const markEmailVerified = useCallback(
    () =>
      updateJourney({
        emailVerifiedAt: new Date(),
      }),
    [updateJourney]
  );

  /**
   * ✅ Get current update status
   */
  const getUpdateStatus = useCallback(
    () => ({
      isUpdating: isUpdatingRef.current,
      pendingUpdates: pendingUpdatesRef.current.length,
      lastRefresh: session?.user?.lastJourneyRefresh,
    }),
    [session?.user?.lastJourneyRefresh]
  );

  return {
    // Core update functions
    updateJourney,
    batchUpdateJourney,
    refreshJourney,

    // Helper functions
    updateStep,
    updateIntention,
    markSuccessViewed,
    markProfileComplete,
    markEmailVerified,

    // Status
    getUpdateStatus,
    isUpdating: isUpdatingRef.current,
  };
}
