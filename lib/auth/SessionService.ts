// lib/auth/SessionService.ts - ENHANCED WITH COMPLETE JOURNEY CACHING
import prisma from "@/lib/prisma";

export class SessionService {
  static buildSession(session: any, token: any) {
    if (!session.user) session.user = {};

    if (token) {
      session.user.id = token.sub || "";
      session.user.name = token.name || "";
      session.user.email = token.email || "";
      session.user.globalRole = (token.globalRole as string) || "USER";
      session.user.isVerified = (token.isVerified as boolean) || false;
      session.user.isActive = (token.isActive as boolean) || false;
      session.user.status = token.status || "PENDING";

      // ✅ ENHANCED: Complete journey data caching in session
      session.user.hasBusinessConnection = token.hasBusinessConnection || false;
      session.user.isProfileComplete = token.isProfileComplete || false;
      session.user.hasViewedSuccess = token.hasViewedSuccess || false;
      session.user.businessIntention = token.businessIntention || null;
      session.user.authMethod = token.authMethod || "email";
      session.user.onboardingStep = token.onboardingStep || null;
      session.user.emailVerifiedAt = token.emailVerifiedAt || null;
      session.user.profileCompletedAt = token.profileCompletedAt || null;
      session.user.intentionSetAt = token.intentionSetAt || null;
      session.user.lastJourneyRefresh = token.lastJourneyRefresh || null;
    }

    return session;
  }

  static async buildJWT(token: any, user: any, account: any, trigger: string) {
    if (account && user) {
      return {
        ...token,
        sub: user.id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
        isVerified: user.isVerified,
        isActive: user.isActive,
        status: user.status,

        // ✅ ENHANCED: Complete journey data caching in JWT
        hasBusinessConnection: user.hasBusinessConnection,
        isProfileComplete: user.isProfileComplete,
        hasViewedSuccess: user.hasViewedSuccess,
        businessIntention: user.businessIntention,
        authMethod: user.authMethod,
        onboardingStep: user.onboardingStep,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
        profileCompletedAt: user.profileCompletedAt?.toISOString(),
        intentionSetAt: user.intentionSetAt?.toISOString(),
        lastJourneyRefresh: new Date().toISOString(),
      };
    }

    // ✅ ENHANCED: Handle session updates with journey data
    if (trigger === "update") {
      // When session.update() is called, merge the new data
      const updateData = user || {};

      return {
        ...token,
        // Update journey fields if provided
        hasBusinessConnection:
          updateData.hasBusinessConnection ?? token.hasBusinessConnection,
        isProfileComplete:
          updateData.isProfileComplete ?? token.isProfileComplete,
        hasViewedSuccess: updateData.hasViewedSuccess ?? token.hasViewedSuccess,
        businessIntention:
          updateData.businessIntention ?? token.businessIntention,
        onboardingStep: updateData.onboardingStep ?? token.onboardingStep,
        emailVerifiedAt: updateData.emailVerifiedAt ?? token.emailVerifiedAt,
        profileCompletedAt:
          updateData.profileCompletedAt ?? token.profileCompletedAt,
        intentionSetAt: updateData.intentionSetAt ?? token.intentionSetAt,
        lastJourneyRefresh:
          updateData.lastJourneyRefresh || new Date().toISOString(),
      };
    }

    // ✅ ENHANCED: Automatic refresh of journey data
    if (this.shouldRefreshJourney(token)) {
      try {
        const freshUserData = await this.getFreshUserData(token.sub);
        return {
          ...token,
          ...freshUserData,
          lastJourneyRefresh: new Date().toISOString(),
        };
      } catch (error) {
        console.warn("Failed to refresh journey data in JWT:", error);
        // Return existing token if refresh fails
        return token;
      }
    }

    return token;
  }

  /**
   * ✅ ENHANCED: More intelligent refresh logic
   */
  private static shouldRefreshJourney(token: any): boolean {
    const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
    const lastRefresh = token.lastJourneyRefresh;

    if (!lastRefresh) return true;

    try {
      const refreshTime = new Date(lastRefresh).getTime();
      return Date.now() - refreshTime > REFRESH_INTERVAL;
    } catch (error) {
      // Invalid date format, force refresh
      return true;
    }
  }

  /**
   * ✅ ENHANCED: Complete journey data fetching
   */
  private static async getFreshUserData(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          hasViewedSuccess: true,
          businessIntention: true,
          onboardingStep: true,
          emailVerifiedAt: true,
          profileCompletedAt: true,
          intentionSetAt: true,
          firstName: true,
          lastName: true,
          phone: true,
          dateOfBirth: true,
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

      if (!user) {
        console.warn(`User ${userId} not found during session refresh`);
        return {};
      }

      // Calculate derived fields
      const isOAuthUser =
        user._count.accounts > 0 && !user.credentials?.passwordHash;
      const authMethod = isOAuthUser ? "oauth" : "email";
      const hasBusinessConnection =
        user._count.ownedBusinesses + user._count.businessMemberships > 0;
      const isProfileComplete = !!(
        user.firstName &&
        user.lastName &&
        user.phone &&
        user.dateOfBirth
      );

      return {
        hasBusinessConnection,
        isProfileComplete,
        hasViewedSuccess: user.hasViewedSuccess,
        businessIntention: user.businessIntention,
        authMethod,
        onboardingStep: user.onboardingStep,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
        profileCompletedAt: user.profileCompletedAt?.toISOString(),
        intentionSetAt: user.intentionSetAt?.toISOString(),
      };
    } catch (error) {
      console.error("Error fetching fresh user data:", error);
      return {};
    }
  }

  /**
   * ✅ NEW: Helper to validate session journey data
   */
  static validateSessionData(session: any): boolean {
    if (!session?.user) return false;

    const required = ["id", "email"];
    return required.every((field) => session.user[field]);
  }

  /**
   * ✅ NEW: Helper to extract journey state from session
   */
  static extractJourneyState(session: any) {
    if (!session?.user) return null;

    const user = session.user;
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      isVerified: user.isVerified,
      isActive: user.isActive,
      authMethod: user.authMethod,
      isProfileComplete: user.isProfileComplete,
      hasBusinessConnection: user.hasBusinessConnection,
      hasViewedSuccess: user.hasViewedSuccess,
      businessIntention: user.businessIntention,
      currentStep: user.onboardingStep,
      intention: user.businessIntention,
      emailVerifiedAt: user.emailVerifiedAt
        ? new Date(user.emailVerifiedAt)
        : null,
      profileCompletedAt: user.profileCompletedAt
        ? new Date(user.profileCompletedAt)
        : null,
      intentionSetAt: user.intentionSetAt
        ? new Date(user.intentionSetAt)
        : null,
    };
  }

  /**
   * ✅ NEW: Helper to get cache age
   */
  static getCacheAge(session: any): number | null {
    const lastRefresh = session?.user?.lastJourneyRefresh;
    if (!lastRefresh) return null;

    try {
      return Date.now() - new Date(lastRefresh).getTime();
    } catch (error) {
      return null;
    }
  }
}
