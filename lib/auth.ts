// lib/auth.ts - ADD CREDENTIALS PROVIDER TO YOUR EXISTING SECURE CONFIG
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"; // ADD THIS
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import {
  checkAccountLockout,
  recordFailedAttempt,
  resetFailedAttempts,
  generateSecureToken,
  verifyPassword, // ADD THIS
} from "@/lib/security/password";

// KEEP YOUR EXISTING SECURE CONFIGURATION - JUST ADD CREDENTIALS PROVIDER
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

    // ADD THIS CREDENTIALS PROVIDER TO YOUR EXISTING CONFIG
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
          // Find user with credentials
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { credentials: true },
          });

          if (!user || !user.credentials) {
            return null;
          }

          // Check account lockout FIRST (your security feature)
          const lockStatus = await checkAccountLockout(user.id);
          if (lockStatus.locked) {
            throw new Error("Account is locked");
          }

          // Verify password using your secure Argon2 verification
          const isValidPassword = await verifyPassword(
            credentials.password,
            user.credentials.passwordHash
          );

          if (!isValidPassword) {
            // Record failed attempt (your security feature)
            await recordFailedAttempt(user.id);
            return null;
          }

          // Check if account is active
          if (!user.isActive) {
            return null;
          }

          // Reset failed attempts on successful login (your security feature)
          await resetFailedAttempts(user.id);

          // Return user for NextAuth session
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
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  // KEEP ALL YOUR EXISTING SECURE SESSION CONFIG
  session: {
    strategy: "database",
    maxAge: 24 * 60 * 60,
    updateAge: 60 * 60,
    generateSessionToken: () => generateSecureToken(32),
  },

  // KEEP ALL YOUR EXISTING SECURE COOKIES CONFIG
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain:
          process.env.NODE_ENV === "production"
            ? process.env.COOKIE_DOMAIN
            : undefined,
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  // KEEP ALL YOUR EXISTING SECURITY CALLBACKS
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // For OAuth providers (Google) - KEEP YOUR EXISTING LOGIC
        if (account?.provider === "google") {
          if (!user.email) {
            console.error("OAuth sign-in attempted without email");
            return false;
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true, credentials: true },
          });

          if (existingUser && existingUser.accounts.length > 0) {
            const hasGoogleAccount = existingUser.accounts.some(
              (acc) => acc.provider === "google"
            );

            if (!hasGoogleAccount) {
              return `/auth/error?error=AccountExistsWithDifferentProvider&email=${encodeURIComponent(user.email)}&provider=google`;
            }
          }

          if (existingUser?.credentials?.id) {
            await prisma.securityEvent.create({
              data: {
                credentialsId: existingUser.credentials.id,
                eventType: "LOGIN_SUCCESS",
                description: `OAuth login via ${account.provider}`,
                ipAddress: null,
                userAgent: null,
              },
            });
          }

          return true;
        }

        // For credentials provider - ALLOW IT THROUGH
        if (account?.provider === "credentials") {
          return true; // authorize() function already handled security
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    // KEEP ALL YOUR EXISTING SESSION/JWT/REDIRECT CALLBACKS
    async session({ session, token, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        session.user.globalRole = user.globalRole || "USER";
        session.user.isVerified = user.isVerified || false;
        session.user.isActive = user.isActive || false;

        // Check if account is locked (your security feature)
        if (user.credentials) {
          const lockStatus = await checkAccountLockout(user.id);
          if (lockStatus.locked) {
            session.user.isActive = false;
          }
        }

        if (token.currentBusinessId) {
          session.user.currentBusinessId = token.currentBusinessId as string;
        }
      }
      return session;
    },

    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.globalRole = user.globalRole || "USER";
        token.isVerified = user.isVerified || false;
        token.isActive = user.isActive || false;
      }

      if (trigger === "update") {
        if (token.sub) {
          const refreshedUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              globalRole: true,
              isVerified: true,
              isActive: true,
            },
          });

          if (refreshedUser) {
            token.globalRole = refreshedUser.globalRole;
            token.isVerified = refreshedUser.isVerified;
            token.isActive = refreshedUser.isActive;
          }
        }
      }

      return token;
    },

    // FIX THE REDIRECT ISSUE HERE
    async redirect({ url, baseUrl }) {
      try {
        // Handle relative URLs
        if (url.startsWith("/")) {
          return `${baseUrl}${url}`;
        }

        // Handle custom error redirects
        if (url.includes("/auth/error")) {
          return url;
        }

        // Handle same-origin URLs
        const redirectUrl = new URL(url, baseUrl);
        const baseUrlObj = new URL(baseUrl);

        if (redirectUrl.origin === baseUrlObj.origin) {
          return url;
        }

        // DEFAULT: After successful login, redirect to dashboard
        return `${baseUrl}/dashboard`;
      } catch {
        return `${baseUrl}/dashboard`;
      }
    },
  },

  // KEEP ALL YOUR EXISTING PAGES CONFIG
  pages: {
    signIn: "/login",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },

  // KEEP ALL YOUR EXISTING SECURITY EVENTS
  events: {
    async createUser({ user }) {
      console.log(`Security Event: New user created - ${user.email}`);

      if (user.email) {
        const credentials = await prisma.userCredentials.findUnique({
          where: { email: user.email },
        });

        if (credentials) {
          await prisma.securityEvent.create({
            data: {
              credentialsId: credentials.id,
              eventType: "LOGIN_SUCCESS",
              description: "Account created",
            },
          });
        }
      }
    },

    async signIn({ user, account, profile, isNewUser }) {
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

    async signOut({ session, token }) {
      console.log(
        `Security Event: Sign out - ${session?.user?.email || "Unknown"}`
      );

      if (session?.user?.email) {
        const credentials = await prisma.userCredentials.findUnique({
          where: { email: session.user.email },
        });

        if (credentials) {
          await prisma.securityEvent.create({
            data: {
              credentialsId: credentials.id,
              eventType: "LOGIN_SUCCESS",
              description: "User signed out",
            },
          });
        }
      }
    },
  },

  // KEEP ALL YOUR EXISTING SECURITY CONFIG
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  useSecureCookies: process.env.NODE_ENV === "production",

  logger: {
    error(code, metadata) {
      console.error(`NextAuth Error [${code}]:`, metadata);
    },
    warn(code) {
      console.warn(`NextAuth Warning [${code}]`);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === "development") {
        console.debug(`NextAuth Debug [${code}]:`, metadata);
      }
    },
  },
};
