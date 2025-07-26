// lib/services/UserJourneyClient.ts - CLIENT SIDE ONLY
"use client";

import {
  UserJourneyState,
  BusinessIntention,
  AuthMethod,
} from "./UserJourneyTypes";

export class UserJourneyClient {
  /**
   * Pure function - determines route from journey state (CLIENT SAFE)
   */
  static determineNextRoute(journeyState: UserJourneyState): string {
    const {
      authMethod,
      status,
      isVerified,
      isProfileComplete,
      hasBusinessConnection,
      hasViewedSuccess,
      intention,
      email,
    } = journeyState;

    // OAuth Flow
    if (authMethod === AuthMethod.OAUTH) {
      if (status === "PENDING" || !isProfileComplete) {
        return "/oauth/setup";
      }
      if (!hasViewedSuccess) {
        return "/signup/success";
      }
      if (hasBusinessConnection) {
        return "/dashboard";
      }
      if (intention === BusinessIntention.SETUP_NOW) {
        return "/business/onboarding";
      }
      if (intention === BusinessIntention.SKIP) {
        return "/dashboard";
      }
      if (intention === BusinessIntention.SETUP_LATER) {
        const intentionAge = journeyState.intentionSetAt
          ? Date.now() - new Date(journeyState.intentionSetAt).getTime()
          : 0;
        if (intentionAge > 24 * 60 * 60 * 1000) {
          return "/signup/success";
        }
        return "/dashboard";
      }
      return "/signup/success";
    }

    // Email Flow
    if (authMethod === AuthMethod.EMAIL) {
      if (status === "ACTIVE" && isVerified && isProfileComplete) {
        if (hasBusinessConnection) return "/dashboard";
        if (intention === BusinessIntention.SETUP_NOW)
          return "/business/onboarding";
        if (intention === BusinessIntention.SKIP) return "/dashboard";
        if (intention === BusinessIntention.SETUP_LATER) {
          const intentionAge = journeyState.intentionSetAt
            ? Date.now() - new Date(journeyState.intentionSetAt).getTime()
            : 0;
          if (intentionAge > 24 * 60 * 60 * 1000) return "/signup/success";
          return "/dashboard";
        }
        return "/dashboard";
      }
      if (!isProfileComplete) {
        return `/signup/email-setup?email=${encodeURIComponent(email || "")}`;
      }
      if (!isVerified) {
        return `/signup/verify-email?email=${encodeURIComponent(email || "")}`;
      }
      if (hasBusinessConnection) return "/dashboard";
      if (isVerified && isProfileComplete) {
        if (!hasViewedSuccess) return "/signup/success";
        if (intention === BusinessIntention.SETUP_NOW)
          return "/business/onboarding";
        if (intention === BusinessIntention.SKIP) return "/dashboard";
        if (intention === BusinessIntention.SETUP_LATER) return "/dashboard";
        return "/signup/success";
      }
      return "/login";
    }

    return "/login";
  }

  /**
   * Get journey state from session (CLIENT SAFE)
   */
  static getJourneyFromSession(session: any): UserJourneyState | null {
    if (!session?.user?.id) return null;

    const user = session.user;
    if (!user.authMethod) return null;

    return {
      id: user.id,
      email: user.email,
      status: user.status || "PENDING",
      isVerified: user.isVerified || false,
      isActive: user.isActive || false,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      phone: user.phone || null,
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
      hasViewedSuccess: user.hasViewedSuccess || false,
      businessIntention: user.businessIntention || null,
      intentionSetAt: user.intentionSetAt
        ? new Date(user.intentionSetAt)
        : null,
      onboardingStep: user.onboardingStep || null,
      emailVerifiedAt: user.emailVerifiedAt
        ? new Date(user.emailVerifiedAt)
        : null,
      profileCompletedAt: user.profileCompletedAt
        ? new Date(user.profileCompletedAt)
        : null,
      authMethod: user.authMethod as AuthMethod,
      isOAuthUser: user.authMethod === AuthMethod.OAUTH,
      isEmailUser: user.authMethod === AuthMethod.EMAIL,
      isProfileComplete: user.isProfileComplete || false,
      hasBusinessConnection: user.hasBusinessConnection || false,
      currentStep: user.onboardingStep as any,
      intention: user.businessIntention as any,
    };
  }
}
