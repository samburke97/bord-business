// lib/services/UserJourneyTypes.ts - TYPES ONLY (No server imports)
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
