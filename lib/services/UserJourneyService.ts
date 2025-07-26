// lib/services/UserJourneyService.ts - FIXED: Move getJourneyFromSession to server side
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  OnboardingStep,
  BusinessIntention,
  AuthMethod,
  UserJourneyState,
} from "./UserJourneyTypes";

export class UserJourneyService {
  private static readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private static readonly STALE_TTL = 5 * 60 * 1000; // 5 minutes (stale threshold)

  /**
   * ✅ FIXED: Get journey from session cache (moved from UserJourneyClient)
   * This needs to run on the server side for app/page.tsx
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

  /**
   * ✅ FIXED: Route determination (moved from UserJourneyClient)
   * This also needs to run on the server side
   */
  // Fixed determineNextRoute method - ACTIVE users go straight to dashboard

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

    // Email Flow - FIXED: ACTIVE users go straight to dashboard
    if (authMethod === AuthMethod.EMAIL) {
      // ✅ FIXED: ACTIVE + verified users go straight to business logic or dashboard
      if (status === "ACTIVE" && isVerified) {
        // User is fully signed up and verified - check business status only

        if (hasBusinessConnection) {
          return "/dashboard";
        }

        // Check business intention only for routing to business setup
        if (intention === BusinessIntention.SETUP_NOW) {
          return "/business/onboarding";
        }

        // ✅ FIXED: All other ACTIVE users go straight to dashboard
        // No more success page for already signed up users
        return "/dashboard";
      }

      // ✅ User is not yet ACTIVE or verified - complete signup flow
      if (!isVerified) {
        return `/signup/verify-email?email=${encodeURIComponent(email || "")}`;
      }

      if (!isProfileComplete) {
        return `/signup/email-setup?email=${encodeURIComponent(email || "")}`;
      }

      // Fallback for any other email user states
      return "/login";
    }

    // Default fallback
    return "/login";
  }

  /**
   * ✅ Smart journey state fetching with stale-while-revalidate
   */
  static async getUserJourneyState(userId: string): Promise<UserJourneyState> {
    // Try to get current session and use cached data
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id === userId) {
        const cachedJourney = this.getJourneyFromSession(session);
        if (cachedJourney) {
          const cacheStatus = this.getCacheStatus(session);

          if (cacheStatus === "fresh") {
            return cachedJourney; // ✅ Fast path: Use fresh cached data (0 DB hits)
          }

          if (cacheStatus === "stale") {
            // ✅ Stale-while-revalidate: Return stale data, refresh in background
            this.refreshInBackground(userId);
            return cachedJourney;
          }
        }
      }
    } catch (error) {
      // Session fetch failed, continue to DB query
      console.warn("Session fetch failed, falling back to DB:", error);
    }

    // Fallback: Fetch from database with optimized query
    return this.getUserJourneyStateFromDB(userId);
  }

  /**
   * ✅ Get cache status (fresh, stale, or expired)
   */
  private static getCacheStatus(session: any): "fresh" | "stale" | "expired" {
    const lastRefresh = session.user?.lastJourneyRefresh;
    if (!lastRefresh) return "expired";

    const now = Date.now();
    const refreshTime = new Date(lastRefresh).getTime();
    const age = now - refreshTime;

    if (age < this.STALE_TTL) return "fresh";
    if (age < this.CACHE_TTL) return "stale";
    return "expired";
  }

  /**
   * ✅ Background refresh for stale-while-revalidate
   */
  private static async refreshInBackground(userId: string): Promise<void> {
    try {
      // Don't await this - let it run in background
      setImmediate(async () => {
        const freshJourney = await this.getUserJourneyStateFromDB(userId);
        await this.triggerSessionUpdate(userId, freshJourney);
      });
    } catch (error) {
      console.warn("Background refresh failed:", error);
    }
  }

  /**
   * ✅ Highly optimized DB query
   */
  private static async getUserJourneyStateFromDB(
    userId: string
  ): Promise<UserJourneyState> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        isVerified: true,
        isActive: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        hasViewedSuccess: true,
        businessIntention: true,
        intentionSetAt: true,
        onboardingStep: true,
        emailVerifiedAt: true,
        profileCompletedAt: true,
        _count: {
          select: {
            accounts: true,
            ownedBusinesses: { where: { isActive: true } },
            businessMemberships: { where: { isActive: true } },
          },
        },
        credentials: {
          select: {
            passwordHash: true,
          },
        },
      },
    });

    if (!user) throw new Error("User not found");

    // Calculate derived fields efficiently
    const isOAuthUser =
      user._count.accounts > 0 && !user.credentials?.passwordHash;
    const isEmailUser = !!user.credentials?.passwordHash;
    const authMethod = isOAuthUser ? AuthMethod.OAUTH : AuthMethod.EMAIL;
    const hasBusinessConnection =
      user._count.ownedBusinesses + user._count.businessMemberships > 0;
    const isProfileComplete = !!(
      user.firstName &&
      user.lastName &&
      user.phone &&
      user.dateOfBirth
    );

    return {
      ...user,
      authMethod,
      isOAuthUser,
      isEmailUser,
      isProfileComplete,
      hasBusinessConnection,
      currentStep: user.onboardingStep as OnboardingStep | null,
      intention: user.businessIntention as BusinessIntention | null,
    };
  }

  /**
   * ✅ Update journey with complete session cache refresh
   */
  static async updateUserJourney(
    userId: string,
    updates: {
      step?: OnboardingStep;
      intention?: BusinessIntention;
      hasViewedSuccess?: boolean;
      onboardingData?: any;
      emailVerifiedAt?: Date;
      profileCompletedAt?: Date;
    }
  ) {
    const updateData: any = {};

    if (updates.step) {
      updateData.onboardingStep = updates.step;
      updateData.lastOnboardingAt = new Date();
    }

    if (updates.intention) {
      updateData.businessIntention = updates.intention;
      updateData.intentionSetAt = new Date();
    }

    if (updates.hasViewedSuccess !== undefined) {
      updateData.hasViewedSuccess = updates.hasViewedSuccess;
    }

    if (updates.onboardingData) {
      updateData.onboardingData = updates.onboardingData;
    }

    if (updates.emailVerifiedAt) {
      updateData.emailVerifiedAt = updates.emailVerifiedAt;
    }

    if (updates.profileCompletedAt) {
      updateData.profileCompletedAt = updates.profileCompletedAt;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // ✅ Trigger session refresh for immediate cache update
    try {
      const freshJourney = await this.getUserJourneyStateFromDB(userId);
      await this.triggerSessionUpdate(userId, freshJourney);
      console.log(`Journey updated and session refreshed for user ${userId}`);
    } catch (error) {
      console.warn("Failed to trigger session refresh:", error);
    }

    return updatedUser;
  }

  /**
   * ✅ Complete session update implementation
   */
  private static async triggerSessionUpdate(
    userId: string,
    journeyState: UserJourneyState
  ): Promise<void> {
    try {
      const cacheData = this.createJourneyCacheData(journeyState);

      if (typeof window === "undefined") {
        console.log(`Server: Session update triggered for user ${userId}`);
        process.emit("journey-session-update", { userId, cacheData });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("journey-session-update", {
            detail: { userId, cacheData },
          })
        );
      }

      console.log(`Session update data prepared for user ${userId}`);
    } catch (error) {
      console.error("Session update failed:", error);
      throw error;
    }
  }

  /**
   * ✅ Create optimized journey data for session caching
   */
  static createJourneyCacheData(journeyState: UserJourneyState) {
    return {
      authMethod: journeyState.authMethod,
      isProfileComplete: journeyState.isProfileComplete,
      hasBusinessConnection: journeyState.hasBusinessConnection,
      hasViewedSuccess: journeyState.hasViewedSuccess,
      businessIntention: journeyState.businessIntention,
      intentionSetAt: journeyState.intentionSetAt?.toISOString(),
      onboardingStep: journeyState.onboardingStep,
      emailVerifiedAt: journeyState.emailVerifiedAt?.toISOString(),
      profileCompletedAt: journeyState.profileCompletedAt?.toISOString(),
      lastJourneyRefresh: new Date().toISOString(),
    };
  }

  /**
   * ✅ Force refresh of journey cache
   */
  static async forceRefreshCache(userId: string): Promise<UserJourneyState> {
    try {
      const freshJourney = await this.getUserJourneyStateFromDB(userId);
      await this.triggerSessionUpdate(userId, freshJourney);
      console.log(`Cache force-refreshed for user ${userId}`);
      return freshJourney;
    } catch (error) {
      console.error("Force refresh failed:", error);
      throw error;
    }
  }
}

// ✅ Re-export everything for backward compatibility
export {
  OnboardingStep,
  BusinessIntention,
  AuthMethod,
} from "./UserJourneyTypes";
export type { UserJourneyState } from "./UserJourneyTypes";
