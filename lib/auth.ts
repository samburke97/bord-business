// lib/auth.ts - Clean Enterprise Solution
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
  verifyPassword,
} from "@/lib/security/password";

// Custom adapter that creates OAuth users with PENDING status
function createCustomAdapter() {
  const baseAdapter = PrismaAdapter(prisma);

  return {
    ...baseAdapter,
    createUser: async (user: any) => {
      console.log("📝 Creating user with adapter:", user);

      // For OAuth users, create with PENDING status
      const newUser = await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          image: user.image,
          status: "PENDING", // CRITICAL: OAuth users start as PENDING
          isVerified: false,
          isActive: false,
        },
      });

      return newUser;
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: createCustomAdapter(),

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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase().trim(),
              status: "ACTIVE", // CRITICAL: Only allow ACTIVE users to login
            },
            include: {
              credentials: true,
            },
          });

          if (!user?.credentials) {
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
            status: user.status,
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
    maxAge: 7 * 24 * 60 * 60,
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 SignIn Callback:", {
        provider: account?.provider,
        email: user.email?.substring(0, 3) + "***",
        userStatus: (user as any).status,
      });

      try {
        if (account?.provider === "credentials") {
          // Credentials users already filtered by ACTIVE status
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
              // Check if user is ACTIVE
              if (existingUser.status !== "ACTIVE") {
                console.log(
                  "❌ SignIn: User exists but not ACTIVE:",
                  existingUser.status
                );
                return `/auth/complete-setup?email=${encodeURIComponent(user.email)}`;
              }

              console.log("✅ SignIn: Existing ACTIVE OAuth user");
              return true;
            }

            // Account exists with different method
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

          // New OAuth user - will be created with PENDING status by adapter
          console.log("✅ SignIn: New OAuth user - will be created as PENDING");
          return true;
        }

        return true;
      } catch (error) {
        console.error("❌ SignIn Callback Error:", error);
        return false;
      }
    },

    async jwt({ token, user, account, trigger }) {
      if (account && user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.globalRole = (user as any).globalRole || "USER";
        token.isVerified = (user as any).isVerified || false;
        token.isActive = (user as any).isActive || false;
        token.status = (user as any).status || "ACTIVE";
      }

      if (trigger === "update" && user) {
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.globalRole = (user as any).globalRole;
        token.isVerified = (user as any).isVerified;
        token.isActive = (user as any).isActive;
        token.status = (user as any).status;
      }

      return token;
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
        session.user.status = (token.status as string) || "ACTIVE";
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirect callback:", { url, baseUrl });

      if (url.startsWith("/")) {
        const fullUrl = `${baseUrl}${url}`;
        return fullUrl;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      // For OAuth users, redirect to complete setup
      const setupUrl = `${baseUrl}/auth/complete-setup`;
      console.log("✅ Redirect: OAuth user - redirecting to setup:", setupUrl);
      return setupUrl;
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      if (process.env.NODE_ENV === "development") {
        console.log("🎉 SignIn Event:", {
          provider: account?.provider,
          isNewUser,
          email: user.email?.substring(0, 3) + "***",
          status: (user as any).status,
        });
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
