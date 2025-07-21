// lib/auth.ts - FIXED: Added missing status field
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import {
  verifyPassword,
  checkAccountLockout,
  recordFailedAttempt,
  resetFailedAttempts,
} from "@/lib/security/password";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: {
              credentials: true,
            },
          });

          if (process.env.NODE_ENV === "development") {
            console.log("🔐 Credentials Auth:", {
              email: credentials.email.substring(0, 3) + "***",
              hasUser: !!user,
              hasCredentials: !!user?.credentials,
            });
          }

          if (!user?.credentials) {
            if (user) {
              console.log("❌ User found but no credentials record");
            }
            return null;
          }

          const lockoutCheck = await checkAccountLockout(user.id);
          if (lockoutCheck.locked) {
            console.log("🔒 Account is locked until:", lockoutCheck.unlockTime);
            return null;
          }

          const isValidPassword = await verifyPassword(
            credentials.password,
            user.credentials.passwordHash
          );

          if (!isValidPassword) {
            await recordFailedAttempt(user.id);
            return null;
          }

          await resetFailedAttempts(user.id);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            globalRole: user.globalRole,
            isVerified: user.isVerified,
            isActive: user.isActive,
            status: user.status, // CRITICAL FIX: Include status
          };
        } catch (error) {
          console.error("❌ Credentials Provider Error:", error);
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
              console.log("✅ SignIn: Existing OAuth user with this provider");
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

          console.log("✅ SignIn: New OAuth user");
          return true;
        }

        return true;
      } catch (error) {
        console.error("❌ SignIn Callback Error:", error);
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
        session.user.status = (token.status as string) || "PENDING"; // CRITICAL FIX: Add status
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
        token.status = user.status; // CRITICAL FIX: Add status
      }

      if (trigger === "update") {
        // When session is updated, refresh user data from database
        console.log("🔄 JWT: Updating session from database");

        if (token.sub) {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              globalRole: true,
              isVerified: true,
              isActive: true,
              status: true, // CRITICAL FIX: Include status
            },
          });

          if (freshUser) {
            token.name = freshUser.name;
            token.email = freshUser.email;
            token.picture = freshUser.image;
            token.globalRole = freshUser.globalRole;
            token.isVerified = freshUser.isVerified;
            token.isActive = freshUser.isActive;
            token.status = freshUser.status; // CRITICAL FIX: Update status
          }
        }
      }

      return token;
    },

    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirect callback:", { url, baseUrl });

      // Handle OAuth success redirects
      if (url.includes("oauth/setup") || url.includes("auth/complete-setup")) {
        return url;
      }

      // Handle error redirects
      if (url.includes("auth/error")) {
        return url;
      }

      // For relative URLs, return as-is
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // For absolute URLs on same domain, return as-is
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Default fallback to base URL
      return baseUrl;
    },
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log("📝 SignIn Event:", {
        provider: account?.provider,
        isNewUser,
        email: user.email?.substring(0, 3) + "***",
      });

      if (
        account &&
        (account.provider === "google" || account.provider === "facebook")
      ) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            // Create new OAuth user with PENDING status
            console.log("🆕 Creating new OAuth user with PENDING status");

            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || user.email!,
                image: user.image,
                globalRole: "USER",
                isVerified: false, // Will be set to true when profile is completed
                isActive: false, // Will be set to true when profile is completed
                status: "PENDING", // CRITICAL FIX: Set PENDING status for new OAuth users
              },
            });

            console.log("✅ New OAuth user created:", newUser.id);
          }
        } catch (error) {
          console.error("❌ SignIn Event Error:", error);
        }
      }
    },
  },
};
