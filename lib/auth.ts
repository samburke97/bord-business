// lib/auth.ts - PRODUCTION SECURITY - Disabled debug mode + sanitized logging
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
        // PRIORITY 1: Sanitized logging - no sensitive information
        if (process.env.NODE_ENV === "development") {
          console.log("🔐 Credentials Provider: Authorization attempt");
        }

        if (!credentials?.email || !credentials?.password) {
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

          if (process.env.NODE_ENV === "development") {
            console.log("👤 Credentials Provider: User lookup result:", {
              found: !!user,
              hasCredentials: !!user?.credentials,
              isVerified: user?.isVerified,
              isActive: user?.isActive,
            });
          }

          if (!user || !user.credentials) {
            return null;
          }

          const lockStatus = await checkAccountLockout(user.id);
          if (lockStatus.locked) {
            throw new Error("Account is locked");
          }

          const isValidPassword = await verifyPassword(
            credentials.password,
            user.credentials.passwordHash
          );

          if (!isValidPassword) {
            await recordFailedAttempt(user.id);
            return null;
          }

          if (!user.isActive || !user.isVerified) {
            return null;
          }

          await resetFailedAttempts(user.id);

          if (process.env.NODE_ENV === "development") {
            console.log("✅ Credentials Provider: Authorization successful");
          }

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
          // PRIORITY 1: Sanitized error logging
          console.error("❌ Credentials Provider: Authorization failed");
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour
  },

  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // PRIORITY 1: Secure cookies in production
        secure: process.env.NODE_ENV === "production",
        domain: undefined,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: undefined,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: undefined,
      },
    },
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // PRIORITY 1: Reduced logging
      if (process.env.NODE_ENV === "development") {
        console.log("🔐 SignIn Callback:", {
          provider: account?.provider,
          email: user.email?.substring(0, 3) + "***", // Partial email only
        });
      }

      try {
        if (account?.provider === "credentials") {
          return true;
        }

        if (
          account?.provider === "google" ||
          account?.provider === "facebook"
        ) {
          if (!user.email) {
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
              return true;
            }

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

          return true;
        }

        return true;
      } catch (error) {
        console.error("❌ SignIn Callback Error");
        return false;
      }
    },

    async session({ session, token }) {
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
      if (account && user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.globalRole = user.globalRole;
        token.isVerified = user.isVerified;
        token.isActive = user.isActive;
      }

      // Only refresh user data periodically, not on every request
      if (
        trigger === "update" ||
        (!user &&
          token.sub &&
          (!token.lastRefresh ||
            Date.now() - (token.lastRefresh as number) > 5 * 60 * 1000))
      ) {
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
            token.lastRefresh = Date.now();
          }
        } catch (error) {
          console.error("❌ JWT Callback: User refresh failed");
        }
      }

      return token;
    },

    async redirect({ url, baseUrl, token }) {
      if (url.startsWith("/")) {
        const fullUrl = `${baseUrl}${url}`;

        if (url === "/dashboard") {
          return `${baseUrl}/auth/setup`;
        }

        return fullUrl;
      }

      if (url.startsWith(baseUrl)) {
        if (url.includes("/dashboard")) {
          return `${baseUrl}/auth/setup`;
        }

        return url;
      }

      return `${baseUrl}/auth/setup`;
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },

  events: {
    async createUser({ user }) {
      // PRIORITY 1: Sanitized logging
      if (process.env.NODE_ENV === "development") {
        console.log(
          `Security Event: New user created - ${user.email?.substring(0, 3)}***`
        );
      }
    },

    async signIn({ user, account }) {
      if (process.env.NODE_ENV === "development") {
        console.log(`Security Event: Sign in via ${account?.provider}`);
      }

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
      if (process.env.NODE_ENV === "development") {
        console.log("Security Event: Sign out");
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  // PRIORITY 1: Disable debug mode completely in production
  debug: false,
  useSecureCookies: process.env.NODE_ENV === "production",
  basePath: process.env.NEXTAUTH_BASEPATH || "/api/auth",

  // PRIORITY 1: Sanitized logging - no sensitive information
  logger: {
    error(code, metadata) {
      console.error(`NextAuth Error [${code}]`);
    },
    warn(code) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`NextAuth Warning [${code}]`);
      }
    },
    debug(code, metadata) {
      // Only log critical debug info in development
      if (process.env.NODE_ENV === "development") {
        const criticalCodes = ["SIGNIN_ERROR", "SESSION_ERROR"];
        if (criticalCodes.includes(code)) {
          console.debug(`NextAuth Debug [${code}]`);
        }
      }
    },
  },
};
