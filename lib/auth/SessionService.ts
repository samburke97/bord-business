export class SessionService {
  static buildSession(session: any, token: any) {
    if (!session.user) session.user = {};

    if (token) {
      session.user.id = token.sub || "";
      session.user.name = token.name || "";
      session.user.email = token.email || "";
      session.user.image = token.picture || "";
      session.user.globalRole = (token.globalRole as string) || "USER";
      session.user.isVerified = (token.isVerified as boolean) || false;
      session.user.isActive = (token.isActive as boolean) || false;
      session.user.status =
        token.status || (session.user.isVerified ? "ACTIVE" : "PENDING");
    }

    return session;
  }

  static buildJWT(token: any, user: any, account: any, trigger: string) {
    if (account && user) {
      return {
        ...token,
        sub: user.id,
        name: user.name,
        email: user.email,
        picture: user.image,
        globalRole: user.globalRole,
        isVerified: user.isVerified,
        isActive: user.isActive,
        status: user.status,
      };
    }

    if (trigger === "update" && token.sub) {
      // Handle token refresh logic here if needed
    }

    return token;
  }
}
