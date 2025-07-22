// lib/auth.ts - CLEAN WORKING VERSION
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

          if (!user?.credentials) {
            return null;
          }

          const lockoutCheck = await checkAccountLockout(user.id);
          if (lockoutCheck.locked) {
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
            status: user.status,
          };
        } catch (error) {
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

          // Find user by email
          const foundUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: {
              accounts: true,
              credentials: true,
            },
          });

          if (foundUser) {
            const hasThisProvider = foundUser.accounts.some(
              (acc) => acc.provider === account.provider
            );

            if (hasThisProvider) {
              // Update user object with existing user data
              user.id = foundUser.id;
              user.globalRole = foundUser.globalRole;
              user.isVerified = foundUser.isVerified;
              user.isActive = foundUser.isActive;
              user.status = foundUser.status;
              return true;
            }

            // If no Account record exists but user was created via OAuth, allow sign-in
            if (foundUser.accounts.length === 0 && !foundUser.credentials) {
              // Update user object with existing user data
              user.id = foundUser.id;
              user.globalRole = foundUser.globalRole;
              user.isVerified = foundUser.isVerified;
              user.isActive = foundUser.isActive;
              user.status = foundUser.status;
              return true;
            }

            // Block if user has other authentication methods
            const hasCredentials = !!foundUser.credentials;
            const hasGoogle = foundUser.accounts.some(
              (acc) => acc.provider === "google"
            );
            const hasFacebook = foundUser.accounts.some(
              (acc) => acc.provider === "facebook"
            );

            let availableMethods = [];
            if (hasCredentials) availableMethods.push("email");
            if (hasGoogle) availableMethods.push("google");
            if (hasFacebook) availableMethods.push("facebook");

            return `/auth/error?error=AccountExistsWithDifferentMethod&email=${encodeURIComponent(user.email)}&available=${availableMethods.join(",")}&attempted=${account.provider}`;
          }

          // Create new OAuth user

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

          // Update user object with new user data
          user.id = newUser.id;
          user.globalRole = newUser.globalRole;
          user.isVerified = newUser.isVerified;
          user.isActive = newUser.isActive;
          user.status = newUser.status;

          return true;
        }

        return true;
      } catch (error) {
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

        if (token.status) {
          session.user.status = token.status as string;
        } else {
          session.user.status = session.user.isVerified ? "ACTIVE" : "PENDING";
        }
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
        token.status = user.status;
      }

      if (trigger === "update") {
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
              status: true,
            },
          });

          if (freshUser) {
            token.name = freshUser.name;
            token.email = freshUser.email;
            token.picture = freshUser.image;
            token.globalRole = freshUser.globalRole;
            token.isVerified = freshUser.isVerified;
            token.isActive = freshUser.isActive;
            token.status = freshUser.status;
          }
        }
      }

      return token;
    },

    async redirect({ url, baseUrl }) {
      if (url.includes("oauth/setup") || url.includes("auth/complete-setup")) {
        return url;
      }

      if (url.includes("auth/error")) {
        return url;
      }

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      return baseUrl;
    },
  },

  events: {},
};
