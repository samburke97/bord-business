import prisma from "@/lib/prisma";

export class OAuthService {
  static async handleExistingUser(user: any, account: any) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      include: { accounts: true, credentials: true },
    });

    if (!existingUser) return null;

    // Check for conflicting auth methods
    const hasEmailCredentials =
      existingUser.credentials && !existingUser.credentials?.passwordHash;
    const hasOtherOAuthProviders = existingUser.accounts.some(
      (acc) => acc.provider !== account.provider
    );

    if (hasEmailCredentials || hasOtherOAuthProviders) {
      const existingMethods = [];
      if (hasEmailCredentials) existingMethods.push("email");
      existingUser.accounts.forEach((acc) => {
        if (!existingMethods.includes(acc.provider)) {
          existingMethods.push(acc.provider);
        }
      });

      throw new Error(`OAuthAccountNotLinked`);
    }

    // Link OAuth account to existing user
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      },
    });

    return existingUser;
  }

  static async createNewUser(user: any, account: any) {
    try {
      const newUser = await prisma.user.create({
        data: {
          email: user.email,
          name: user.name || user.email,
          image: user.image,
          globalRole: "USER",
          isVerified: false,
          isActive: false,
          status: "PENDING",
        },
      });

      await prisma.account.create({
        data: {
          userId: newUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state,
        },
      });

      return newUser;
    } catch (error) {
      // Handle concurrent creation
      if (
        error.code === "P2002" ||
        error.message.includes("Unique constraint")
      ) {
        return await this.handleExistingUser(user, account);
      }
      throw error;
    }
  }
}
