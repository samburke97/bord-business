// lib/auth.ts - FIXED: Enforce single authentication method per email
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

          // Check if user already exists with different authentication method
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: {
              accounts: true,
              credentials: true,
            },
          });

          if (existingUser) {
            // User already exists - check if they're trying to use a different method
            const hasCurrentProvider = existingUser.accounts.some(
              (acc) => acc.provider === account.provider
            );

            if (hasCurrentProvider) {
              // User already has this OAuth provider - allow signin
              user.id = existingUser.id;
              user.globalRole = existingUser.globalRole;
              user.isVerified = existingUser.isVerified;
              user.isActive = existingUser.isActive;
              user.status = existingUser.status;
              return true;
            }

            // Check if user has different authentication methods
            const hasEmailCredentials =
              !!existingUser.credentials?.passwordHash;
            const hasOtherOAuthProviders = existingUser.accounts.some(
              (acc) => acc.provider !== account.provider
            );

            if (hasEmailCredentials || hasOtherOAuthProviders) {
              // User exists with different method - BLOCK and redirect to error
              const existingMethods = [];
              if (hasEmailCredentials) existingMethods.push("email");
              existingUser.accounts.forEach((acc) => {
                if (!existingMethods.includes(acc.provider)) {
                  existingMethods.push(acc.provider);
                }
              });

              // Redirect to error page with existing methods info
              const errorUrl = `/auth/error?error=AccountExistsWithDifferentMethod&email=${encodeURIComponent(
                user.email
              )}&available=${existingMethods.join(",")}&attempted=${account.provider}`;

              throw new Error(`REDIRECT:${errorUrl}`);
            }

            // ✅ FIXED: User exists but has no auth methods - link this OAuth to existing user
            // Update user data in the user object for JWT, but keep existing user record
            user.id = existingUser.id;
            user.globalRole = existingUser.globalRole;
            user.isVerified = existingUser.isVerified;
            user.isActive = existingUser.isActive;
            user.status = existingUser.status;

            // Return true - NextAuth will automatically create the Account record linking this OAuth
            return true;
          }

          // ✅ FIXED: User doesn't exist - create user but don't interfere with Account creation
          // NextAuth will call this callback BEFORE creating the Account record
          // So we create the User record here, then NextAuth creates the Account record
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

            // Update the user object with the new user's data for JWT
            user.id = newUser.id;
            user.globalRole = newUser.globalRole;
            user.isVerified = newUser.isVerified;
            user.isActive = newUser.isActive;
            user.status = newUser.status;

            console.log("✅ Created new OAuth user:", {
              id: newUser.id,
              email: newUser.email,
              provider: account.provider,
            });

            // ✅ CRITICAL: Return true and let NextAuth create the Account record automatically
            return true;
          } catch (createError) {
            // Handle case where user creation fails (e.g., email already exists due to race condition)
            if (createError.code === "P2002") {
              // Unique constraint violation - user was created between our check and create
              const justCreatedUser = await prisma.user.findUnique({
                where: { email: user.email },
              });

              if (justCreatedUser) {
                user.id = justCreatedUser.id;
                user.globalRole = justCreatedUser.globalRole;
                user.isVerified = justCreatedUser.isVerified;
                user.isActive = justCreatedUser.isActive;
                user.status = justCreatedUser.status;
                return true;
              }
            }

            console.error("Failed to create OAuth user:", createError);
            return false;
          }
        }

        return true;
      } catch (error) {
        // Check if this is a redirect error
        if (error instanceof Error && error.message.startsWith("REDIRECT:")) {
          console.log(
            "🚨 Blocking OAuth signin due to existing different auth method"
          );
          return false;
        }

        console.error("SignIn callback error:", error);
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
          // Email users (who have credentials/passwords) should never be PENDING
          // Only OAuth users without completed profiles are PENDING
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
        // When session is updated, refresh user data from database
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
      // Handle OAuth error redirects
      if (url.includes("/auth/error")) {
        return url.startsWith(baseUrl) ? url : `${baseUrl}${url}`;
      }

      // Handle OAuth success redirects
      if (url.includes("oauth/setup") || url.includes("auth/complete-setup")) {
        return url.startsWith(baseUrl) ? url : `${baseUrl}${url}`;
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
};
