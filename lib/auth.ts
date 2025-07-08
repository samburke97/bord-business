// lib/auth.ts - FIXED OAUTH FLOW TO BUSINESS SETUP
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import {
  checkAccountLockout,
  recordFailedAttempt,
  resetFailedAttempts,
  generateSecureToken,
  verifyPassword,
} from "@/lib/security/password";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "email",
        },
      },
    }),

    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        console.log(
          "🔐 Credentials Provider: Starting authorization for",
          credentials?.email
        );

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Credentials Provider: Missing email or password");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() },
            include: {
              credentials: true,
              ownedBusinesses: true,
              businessMemberships: true,
            },
          });

          console.log("👤 Credentials Provider: User lookup result:", {
            found: !!user,
            hasCredentials: !!user?.credentials,
            isVerified: user?.isVerified,
            isActive: user?.isActive,
          });

          if (!user || !user.credentials) {
            console.log(
              "❌ Credentials Provider: User not found or no credentials"
            );
            return null;
          }

          const lockStatus = await checkAccountLockout(user.id);
          if (lockStatus.locked) {
            console.log("❌ Credentials Provider: Account is locked");
            throw new Error("Account is locked");
          }

          const isValidPassword = await verifyPassword(
            credentials.password,
            user.credentials.passwordHash
          );

          if (!isValidPassword) {
            console.log("❌ Credentials Provider: Invalid password");
            await recordFailedAttempt(user.id);
            return null;
          }

          if (!user.isActive) {
            console.log("❌ Credentials Provider: Account is inactive");
            return null;
          }

          if (!user.isVerified) {
            console.log("❌ Credentials Provider: Account is not verified");
            return null;
          }

          await resetFailedAttempts(user.id);

          console.log("✅ Credentials Provider: Authorization successful");

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            globalRole: user.globalRole,
            isVerified: user.isVerified,
            isActive: user.isActive,
          };
        } catch (error) {
          console.error("❌ Credentials Provider: Authorization error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
    updateAge: 60 * 60,
  },

  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        domain: undefined,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        domain: undefined,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        domain: undefined,
      },
    },
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 SignIn Callback:", {
        provider: account?.provider,
        email: user.email,
        userId: user.id,
      });

      try {
        if (account?.provider === "credentials") {
          return true;
        }

        if (
          account?.provider === "google" ||
          account?.provider === "facebook"
        ) {
          if (!user.email) {
            console.error("❌ OAuth sign-in attempted without email");
            return false;
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: {
              accounts: true,
              credentials: true,
            },
          });

          if (existingUser) {
            const hasThisProvider = existingUser.accounts.some(
              (acc) => acc.provider === account.provider
            );

            if (hasThisProvider) {
              console.log("✅ User signing in with existing OAuth provider");
              return true;
            }

            console.log("⚠️ User exists with different sign-in method");

            const hasCredentials = !!existingUser.credentials;
            const hasGoogle = existingUser.accounts.some(
              (acc) => acc.provider === "google"
            );
            const hasFacebook = existingUser.accounts.some(
              (acc) => acc.provider === "facebook"
            );

            let availableMethods = [];
            if (hasCredentials) availableMethods.push("email");
            if (hasGoogle) availableMethods.push("google");
            if (hasFacebook) availableMethods.push("facebook");

            return `/auth/error?error=AccountExistsWithDifferentMethod&email=${encodeURIComponent(user.email)}&available=${availableMethods.join(",")}&attempted=${account.provider}`;
          }

          console.log("✅ New OAuth user - allowing account creation");
          return true;
        }

        return true;
      } catch (error) {
        console.error("❌ SignIn Callback Error:", error);
        return false;
      }
    },

    async session({ session, token }) {
      console.log("📋 Session Callback:", {
        hasSession: !!session,
        hasToken: !!token,
        tokenSub: token?.sub,
      });

      if (!session.user) {
        session.user = {};
      }

      if (token) {
        session.user.id = token.sub || "";
        session.user.name = token.name || "";
        session.user.email = token.email || "";
        session.user.image = token.picture || "";
        session.user.globalRole = (token.globalRole as string) || "USER";
        session.user.isVerified = (token.isVerified as boolean) || false;
        session.user.isActive = (token.isActive as boolean) || false;
      }

      return session;
    },

    async jwt({ token, user, account, trigger }) {
      console.log("🎟️ JWT Callback:", {
        trigger,
        hasUser: !!user,
        hasAccount: !!account,
        provider: account?.provider,
        tokenSub: token?.sub,
      });

      if (account && user) {
        console.log("🆕 JWT Callback: Initial sign in");
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.globalRole = user.globalRole;
        token.isVerified = user.isVerified;
        token.isActive = user.isActive;
      }

      if (trigger === "update" || (!user && token.sub)) {
        console.log("🔄 JWT Callback: Refreshing user data");
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              globalRole: true,
              isVerified: true,
              isActive: true,
            },
          });

          if (dbUser) {
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.picture = dbUser.image;
            token.globalRole = dbUser.globalRole;
            token.isVerified = dbUser.isVerified;
            token.isActive = dbUser.isActive;
          }
        } catch (error) {
          console.error("❌ JWT Callback: Error refreshing user data:", error);
        }
      }

      return token;
    },

    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirect Callback:", { url, baseUrl });

      if (url.startsWith("/")) {
        const fullUrl = `${baseUrl}${url}`;
        console.log("🏠 Redirect: Relative URL:", fullUrl);
        return fullUrl;
      }

      if (url.startsWith(baseUrl)) {
        console.log("🏠 Redirect: Same origin URL:", url);
        return url;
      }

      // CRITICAL: OAuth users go to business setup, NOT dashboard
      const businessSetupUrl = `${baseUrl}/auth/setup`;
      console.log(
        "🏗️ Redirect: OAuth user to business setup:",
        businessSetupUrl
      );
      return businessSetupUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },

  events: {
    async createUser({ user }) {
      console.log(`Security Event: New user created - ${user.email}`);
    },

    async signIn({ user, account }) {
      console.log(
        `Security Event: Sign in - ${user.email} via ${account?.provider}`
      );

      if (user.email) {
        const credentials = await prisma.userCredentials.findUnique({
          where: { email: user.email },
        });

        if (credentials) {
          await prisma.userCredentials.update({
            where: { id: credentials.id },
            data: {
              lastLoginAt: new Date(),
            },
          });

          await resetFailedAttempts(user.id);
        }
      }
    },

    async signOut({ session }) {
      console.log(
        `Security Event: Sign out - ${session?.user?.email || "Unknown"}`
      );
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  useSecureCookies: false,
  basePath: process.env.NEXTAUTH_BASEPATH || "/api/auth",

  logger: {
    error(code, metadata) {
      console.error(`NextAuth Error [${code}]:`, metadata);
    },
    warn(code) {
      console.warn(`NextAuth Warning [${code}]`);
    },
    debug(code, metadata) {
      console.debug(`NextAuth Debug [${code}]:`, metadata);
    },
  },
};
