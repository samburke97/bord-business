// lib/auth/OAuthService.ts - FIXED: Allow PENDING OAuth users to continue
import prisma from "@/lib/prisma";

export class OAuthService {
  static async handleExistingUser(user: any, account: any) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      include: { accounts: true, credentials: true },
    });

    if (!existingUser) return null;

    // CRITICAL FIX: Check if this is the SAME OAuth user trying to continue
    const existingOAuthAccount = existingUser.accounts.find(
      (acc) =>
        acc.provider === account.provider &&
        acc.providerAccountId === account.providerAccountId
    );

    if (existingOAuthAccount) {
      // This is the SAME OAuth user - allow them to continue regardless of status
      console.log("✅ Same OAuth user continuing setup:", {
        userId: existingUser.id,
        email: existingUser.email,
        status: existingUser.status,
        provider: account.provider,
      });
      return existingUser;
    }

    // Check if this is the same provider but different account ID
    const sameProviderAccount = existingUser.accounts.find(
      (acc) => acc.provider === account.provider
    );

    if (sameProviderAccount) {
      // Same provider, different account - this is suspicious, block it
      throw new Error(`OAuthAccountNotLinked`);
    }

    // CRITICAL FIX: For PENDING users with no completed setup, allow linking new OAuth provider
    if (existingUser.status === "PENDING" && !existingUser.isVerified) {
      console.log("✅ Linking new OAuth provider to PENDING user:", {
        userId: existingUser.id,
        email: existingUser.email,
        newProvider: account.provider,
        existingProviders: existingUser.accounts.map((acc) => acc.provider),
      });

      // Link the new OAuth account to the pending user
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

    // For ACTIVE/verified users, check for conflicting auth methods
    const hasEmailCredentials =
      existingUser.credentials && existingUser.credentials.passwordHash;
    const hasOtherOAuthProviders = existingUser.accounts.length > 0;

    if (hasEmailCredentials || hasOtherOAuthProviders) {
      const existingMethods = [];
      if (hasEmailCredentials) existingMethods.push("email");
      existingUser.accounts.forEach((acc) => {
        if (!existingMethods.includes(acc.provider)) {
          existingMethods.push(acc.provider);
        }
      });

      console.log("🚨 Blocking OAuth signin - conflicting auth methods:", {
        email: existingUser.email,
        status: existingUser.status,
        isVerified: existingUser.isVerified,
        existingMethods,
        attemptedProvider: account.provider,
      });

      throw new Error(`OAuthAccountNotLinked`);
    }

    // Link OAuth account to existing user (fallback case)
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

      console.log("✅ Created new OAuth user:", {
        userId: newUser.id,
        email: newUser.email,
        provider: account.provider,
      });

      return newUser;
    } catch (error) {
      // Handle concurrent creation
      if (
        error.code === "P2002" ||
        error.message.includes("Unique constraint")
      ) {
        console.log("🔄 Concurrent creation detected, retrying...");
        return await this.handleExistingUser(user, account);
      }
      throw error;
    }
  }
}
