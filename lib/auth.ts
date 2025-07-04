import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Facebook OAuth Provider
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),

    // Credentials Provider for Email/Password
    CredentialsProvider({
      id: "credentials",
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
          // Find user with credentials
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              credentials: true,
            },
          });

          if (!user || !user.credentials) {
            return null;
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(
            credentials.password + user.credentials.passwordSalt,
            user.credentials.passwordHash
          );

          if (!isValidPassword) {
            return null;
          }

          // Check if account is active and verified
          if (!user.isActive) {
            return null;
          }

          // Return user object for NextAuth
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            globalRole: user.globalRole,
            isVerified: user.isVerified,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          // Check if user already exists with this email
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (
            existingUser &&
            existingUser.email !== user.email &&
            account?.provider
          ) {
            // Account exists with different provider
            return `/auth/error?error=AccountExistsWithDifferentProvider&email=${encodeURIComponent(
              user.email!
            )}&provider=${account.provider}`;
          }

          // New user, allow sign in
          return true;
        } catch (error) {
          console.error("Error checking existing user:", error);
          return false;
        }
      }

      // For credentials provider, always allow (it handles its own verification)
      return true;
    },

    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = token.sub || user?.id;
        session.user.globalRole =
          (token.globalRole as "USER" | "ADMIN" | "SUPER_ADMIN") || "USER";

        // Add business context if available
        if (token.currentBusinessId) {
          session.user.currentBusinessId = token.currentBusinessId as string;
        }
      }
      return session;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.globalRole = user.globalRole || "USER";
      }
      return token;
    },

    async redirect({ url, baseUrl }) {
      // Handle custom error redirects
      if (
        url.includes("/auth/error?error=AccountExistsWithDifferentProvider")
      ) {
        return url;
      }

      // Business-specific redirect logic
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;

      // Default redirect for business users
      return `${baseUrl}/dashboard`;
    },
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  events: {
    async createUser({ user }) {
      console.log("New business user created:", user.email);
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
