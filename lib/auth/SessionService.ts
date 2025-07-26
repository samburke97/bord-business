// lib/auth/SessionService.ts - ENHANCED
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

      // ✅ NEW: Cache journey data in session
      session.user.hasBusinessConnection = token.hasBusinessConnection || false;
      session.user.isProfileComplete = token.isProfileComplete || false;
      session.user.hasViewedSuccess = token.hasViewedSuccess || false;
      session.user.businessIntention = token.businessIntention || null;
      session.user.authMethod = token.authMethod || "email";
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

        // ✅ NEW: Cache journey data in JWT
        hasBusinessConnection: user.hasBusinessConnection,
        isProfileComplete: user.isProfileComplete,
        hasViewedSuccess: user.hasViewedSuccess,
        businessIntention: user.businessIntention,
        authMethod: user.authMethod,
        lastRefresh: Date.now(),
      };
    }

    // ✅ NEW: Refresh journey data periodically
    if (trigger === "update" || this.shouldRefreshJourney(token)) {
      const freshUserData = await this.getFreshUserData(token.sub);
      return { ...token, ...freshUserData, lastRefresh: Date.now() };
    }

    return token;
  }

  private static shouldRefreshJourney(token: any): boolean {
    const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
    return (
      !token.lastRefresh || Date.now() - token.lastRefresh > REFRESH_INTERVAL
    );
  }

  private static async getFreshUserData(userId: string) {
    // Lightweight query for journey data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        hasViewedSuccess: true,
        businessIntention: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        _count: {
          select: {
            ownedBusinesses: { where: { isActive: true } },
            businessMemberships: { where: { isActive: true } },
          },
        },
      },
    });

    if (!user) return {};

    return {
      hasBusinessConnection:
        user._count.ownedBusinesses + user._count.businessMemberships > 0,
      isProfileComplete: !!(
        user.firstName &&
        user.lastName &&
        user.phone &&
        user.dateOfBirth
      ),
      hasViewedSuccess: user.hasViewedSuccess,
      businessIntention: user.businessIntention,
    };
  }
}
