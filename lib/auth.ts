// lib/auth.ts - ORIGINAL VERSION
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
            });
          }

          if (!user?.credentials) {
            await recordFailedAttempt(credentials.email);
            return null;
          }

          const isLocked = await checkAccountLockout(credentials.email);
          if (isLocked) {
            return null;
          }

          const isValidPassword = await verifyPassword(
            credentials.password,
            user.credentials.hashedPassword
          );

          if (!isValidPassword) {
            await recordFailedAttempt(credentials.email);
            return null;
          }

          await resetFailedAttempts(credentials.email);

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
          console.error("❌ Credentials Provider Error");
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (process.env.NODE_ENV === "development") {
        console.log("🔐 SignIn Callback:", {
          provider: account?.provider,
          email: user.email?.substring(0, 3) + "***",
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
              // ORIGINAL: Route existing OAuth users to setup
              return "/auth/setup";
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

          // ORIGINAL: Route new OAuth users to setup
          return "/auth/setup";
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

      if (trigger === "update" && user) {
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.globalRole = user.globalRole;
        token.isVerified = user.isVerified;
        token.isActive = user.isActive;
      }

      return token;
    },

    // ORIGINAL: Default redirect to setup for OAuth flows
    async redirect({ url, baseUrl }) {
      // If it's a relative URL, make it absolute
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // If it's a full URL and points to our domain, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // ORIGINAL: Default fallback - route to setup
      return `${baseUrl}/auth/setup`;
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      if (process.env.NODE_ENV === "development") {
        console.log("🎉 SignIn Event:", {
          provider: account?.provider,
          isNewUser,
          email: user.email?.substring(0, 3) + "***",
        });
      }
    },
  },

  // PRIORITY 1: Security configurations
  secret: process.env.NEXTAUTH_SECRET,

  // Disable debug mode in production
  debug: process.env.NODE_ENV === "development",
};
