// lib/auth.ts - COOKIE CONFIGURATION FIX
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
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

    // CREDENTIALS PROVIDER
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
          // Find user with credentials
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

          // Check account lockout FIRST
          const lockStatus = await checkAccountLockout(user.id);
          if (lockStatus.locked) {
            console.log("❌ Credentials Provider: Account is locked");
            throw new Error("Account is locked");
          }

          // Verify password using your secure Argon2 verification
          const isValidPassword = await verifyPassword(
            credentials.password,
            user.credentials.passwordHash
          );

          if (!isValidPassword) {
            console.log("❌ Credentials Provider: Invalid password");
            await recordFailedAttempt(user.id);
            return null;
          }

          // Check if account is active
          if (!user.isActive) {
            console.log("❌ Credentials Provider: Account is inactive");
            return null;
          }

          // Check if account is verified
          if (!user.isVerified) {
            console.log("❌ Credentials Provider: Account is not verified");
            return null;
          }

          // Reset failed attempts on successful login
          await resetFailedAttempts(user.id);

          console.log("✅ Credentials Provider: Authorization successful");

          // Return user object that NextAuth expects
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            // Add custom fields that will be available in session
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

  // SESSION CONFIGURATION
  session: {
    strategy: "database", // Keep database strategy for security
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour
    generateSessionToken: () => generateSecureToken(32),
  },

  // FIXED COOKIE CONFIGURATION FOR DEVELOPMENT
  cookies: {
    sessionToken: {
      name: "next-auth.session-token", // SIMPLIFIED - no __Secure prefix in development
      options: {
        httpOnly: true,
        sameSite: "lax", // More permissive for development
        path: "/",
        secure: false, // Allow non-HTTPS in development
        // Remove domain restriction for development
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },

  // CALLBACKS
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 SignIn Callback:", {
        provider: account?.provider,
        email: user.email,
        userId: user.id,
      });

      try {
        // For OAuth providers (Google)
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

        // For credentials provider - ALWAYS ALLOW
        if (account?.provider === "credentials") {
          console.log("✅ SignIn Callback: Credentials provider - allowing");
          return true;
        }

        return true;
      } catch (error) {
        console.error("❌ SignIn Callback Error:", error);
        return false;
      }
    },

    async session({ session, user, token }) {
      console.log("📋 Session Callback:", {
        hasSession: !!session,
        hasUser: !!user,
        hasToken: !!token,
        userId: user?.id || token?.sub,
      });

      if (session.user) {
        if (user) {
          // Database session strategy - user object is available
          session.user.id = user.id;
          session.user.globalRole = user.globalRole || "USER";
          session.user.isVerified = user.isVerified || false;
          session.user.isActive = user.isActive || false;

          // Check if account is locked
          if (user.credentials) {
            const lockStatus = await checkAccountLockout(user.id);
            if (lockStatus.locked) {
              session.user.isActive = false;
            }
          }
        } else if (token) {
          // Fallback to token data if user not available
          session.user.id = token.sub || "";
          session.user.globalRole = (token.globalRole as string) || "USER";
          session.user.isVerified = (token.isVerified as boolean) || false;
          session.user.isActive = (token.isActive as boolean) || false;
        }
      }

      console.log("✅ Session Callback: Final session user:", {
        id: session.user?.id,
        email: session.user?.email,
        globalRole: session.user?.globalRole,
        isVerified: session.user?.isVerified,
        isActive: session.user?.isActive,
      });

      return session;
    },

    async jwt({ token, user, account, trigger }) {
      console.log("🎟️ JWT Callback:", {
        trigger,
        hasUser: !!user,
        hasAccount: !!account,
        tokenSub: token.sub,
      });

      if (user) {
        // Initial sign in
        token.globalRole = user.globalRole || "USER";
        token.isVerified = user.isVerified || false;
        token.isActive = user.isActive || false;
      }

      if (trigger === "update") {
        // Token refresh
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

    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirect Callback:", { url, baseUrl });

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

  // PAGES CONFIGURATION
  pages: {
    signIn: "/login",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },

  // EVENTS - Enhanced logging
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

  // ENHANCED DEBUGGING
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // ENABLE FULL DEBUG MODE
  useSecureCookies: false, // DISABLE FOR DEVELOPMENT

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
