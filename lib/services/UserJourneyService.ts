// lib/services/UserJourneyService.ts
import prisma from "@/lib/prisma";

export enum OnboardingStep {
  // OAuth Flow Steps
  OAUTH_PROFILE_SETUP = "oauth_profile_setup",
  OAUTH_SUCCESS_VIEWED = "oauth_success_viewed",

  // Email Flow Steps
  EMAIL_PROFILE_SETUP = "email_profile_setup",
  EMAIL_VERIFICATION_PENDING = "email_verification_pending",
  EMAIL_VERIFIED = "email_verified",
  EMAIL_VERIFICATION_SUCCESS_VIEWED = "email_verification_success_viewed",

  // Common Steps
  BUSINESS_INTENTION_SET = "business_intention_set",
  BUSINESS_SETUP = "business_setup",
  COMPLETED = "completed",
}

export enum BusinessIntention {
  SETUP_NOW = "setup_now",
  SETUP_LATER = "setup_later",
  SKIP = "skip",
}

export enum AuthMethod {
  OAUTH = "oauth",
  EMAIL = "email",
}

export interface UserJourneyState {
  id: string;
  email: string | null;
  status: string;
  isVerified: boolean;
  isActive: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  hasViewedSuccess: boolean;
  businessIntention: string | null;
  intentionSetAt: Date | null;
  onboardingStep: string | null;
  emailVerifiedAt: Date | null;
  profileCompletedAt: Date | null;
  authMethod: AuthMethod;
  isOAuthUser: boolean;
  isEmailUser: boolean;
  isProfileComplete: boolean;
  hasBusinessConnection: boolean;
  currentStep: OnboardingStep | null;
  intention: BusinessIntention | null;
}

export class UserJourneyService {
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

    return await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  static async getUserJourneyState(userId: string): Promise<UserJourneyState> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        credentials: true,
        ownedBusinesses: {
          where: { isActive: true },
          select: { id: true },
        },
        businessMemberships: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!user) throw new Error("User not found");

    // Determine authentication method
    const isOAuthUser =
      user.accounts.length > 0 && !user.credentials?.passwordHash;
    const isEmailUser = !!user.credentials?.passwordHash;
    const authMethod = isOAuthUser ? AuthMethod.OAUTH : AuthMethod.EMAIL;

    const isProfileComplete = !!(
      user.firstName &&
      user.lastName &&
      user.phone &&
      user.dateOfBirth
    );

    const hasBusinessConnection =
      user.ownedBusinesses.length > 0 || user.businessMemberships.length > 0;

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

  static determineNextRoute(journeyState: UserJourneyState): string {
    const {
      authMethod,
      status,
      isVerified,
      isProfileComplete,
      hasBusinessConnection,
      hasViewedSuccess,
      intention,
      currentStep,
      emailVerifiedAt,
      email,
    } = journeyState;

    // =======================================================================
    // OAUTH FLOW ROUTING
    // =======================================================================
    if (authMethod === AuthMethod.OAUTH) {
      // 1. Profile not complete - needs setup
      if (status === "PENDING" || !isProfileComplete) {
        return "/oauth/setup";
      }

      // 2. Profile complete but hasn't seen success page - show choice
      if (!hasViewedSuccess) {
        return "/signup/success";
      }

      // 3. Has business connection - go to dashboard
      if (hasBusinessConnection) {
        return "/dashboard";
      }

      // 4. Handle business intentions
      if (intention === BusinessIntention.SETUP_NOW) {
        return "/business/onboarding";
      }

      if (intention === BusinessIntention.SKIP) {
        return "/dashboard";
      }

      // 5. Setup later but check if enough time passed to ask again
      if (intention === BusinessIntention.SETUP_LATER) {
        const intentionAge = journeyState.intentionSetAt
          ? Date.now() - new Date(journeyState.intentionSetAt).getTime()
          : 0;

        // After 24 hours, ask again
        if (intentionAge > 24 * 60 * 60 * 1000) {
          return "/signup/success";
        }

        return "/dashboard";
      }

      // 6. No intention set - show success page for choice
      return "/signup/success";
    }
    // =======================================================================
    // EMAIL FLOW ROUTING - SIMPLIFIED ENTERPRISE
    // =======================================================================
    if (authMethod === AuthMethod.EMAIL) {
      // 1. Profile not complete - needs setup
      if (!isProfileComplete) {
        return `/signup/email-setup?email=${encodeURIComponent(email || "")}`;
      }

      // 2. Profile complete but email not verified
      if (!isVerified) {
        return `/signup/verify-email?email=${encodeURIComponent(email || "")}`;
      }

      // 3. Has business connection - go to dashboard
      if (hasBusinessConnection) {
        return "/dashboard";
      }

      // 4. SIMPLE: All verified email users go to dashboard
      // We can add choice logic later once basic flow works
      if (isVerified && isProfileComplete) {
        return "/dashboard";
      }

      // Fallback
      return "/login";
    }
  }
}
