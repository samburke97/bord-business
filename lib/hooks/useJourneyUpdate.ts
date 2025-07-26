"use client";

import { useSession } from "next-auth/react";
import {
  UserJourneyState,
  OnboardingStep,
  BusinessIntention,
} from "@/lib/services/UserJourneyService";

export function useJourneyUpdate() {
  const { update } = useSession();

  const updateJourney = async (changes: Partial<UserJourneyState>) => {
    // Update database
    const response = await fetch("/api/user/journey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });

    if (!response.ok) {
      throw new Error("Failed to update journey");
    }

    await update({
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
    });

    return response.json();
  };

  return { updateJourney };
}
