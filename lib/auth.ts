// lib/auth.ts - COMPLETE FIX FOR SESSION TOKEN ISSUE
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

  // SESSION CONFIGURATION - SWITCH TO JWT FOR CREDENTIALS SUPPORT
  session: {
    strategy: "jwt", // CRITICAL: Must use JWT with credentials provider
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour
  },

  // CRITICAL FIX: Cookie configuration that actually works
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // MUST be false for localhost development
        domain: undefined, // CRITICAL: Don't set domain for localhost
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

  // CALLBACKS - FIXED FOR DATABASE SESSIONS
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 SignIn Callback:", {
        provider: account?.provider,
        email: user.email,
        userId: user.id,
      });

      try {
        // For credentials provider - ALWAYS ALLOW (already validated in authorize)
        if (account?.provider === "credentials") {
          console.log("✅ SignIn Callback: Credentials provider - allowing");
          return true;
        }

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

        return true;
      } catch (error) {
        console.error("❌ SignIn Callback Error:", error);
        return false;
      }
    },

    async session({ session, token }) {
      console.log("📋 Session Callback: CALLED!", {
        hasSession: !!session,
        hasToken: !!token,
        strategy: "jwt",
        tokenSub: token?.sub,
      });

      // Ensure session.user exists
      if (!session.user) {
        session.user = {};
      }

      if (token) {
        // JWT strategy - user data comes from token
        console.log("🔄 Session Callback: Using JWT token data");
        session.user.id = token.sub || "";
        session.user.name = token.name || "";
        session.user.email = token.email || "";
        session.user.image = token.picture || "";
        session.user.globalRole = (token.globalRole as string) || "USER";
        session.user.isVerified = (token.isVerified as boolean) || false;
        session.user.isActive = (token.isActive as boolean) || false;
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
        strategy: "jwt",
      });

      // If user just signed in, populate token with user data
      if (user) {
        console.log("🔄 JWT Callback: Populating token with user data");
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.globalRole = user.globalRole || "USER";
        token.isVerified = user.isVerified || false;
        token.isActive = user.isActive || false;
      }

      // Handle token refresh
      if (trigger === "update" && token.sub) {
        console.log("🔄 JWT Callback: Refreshing token data");
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

      console.log("✅ JWT Callback: Final token:", {
        sub: token.sub,
        email: token.email,
        globalRole: token.globalRole,
        isVerified: token.isVerified,
        isActive: token.isActive,
      });

      return token;
    },

    // CRITICAL FIX: Redirect callback that properly handles successful login
    async redirect({ url, baseUrl }) {
      console.log("🔄 Redirect Callback:", { url, baseUrl });

      try {
        // Always use the request's base URL for consistency
        const requestBaseUrl = baseUrl;

        // CRITICAL FIX: After successful credentials login, redirect to dashboard
        // Don't redirect back to password page or auth pages
        if (url.includes("/auth/password") || url.includes("/auth/")) {
          const dashboardUrl = `${requestBaseUrl}/dashboard`;
          console.log(
            "🏠 Redirect: Auth page detected, redirecting to dashboard:",
            dashboardUrl
          );
          return dashboardUrl;
        }

        // Handle relative URLs
        if (url.startsWith("/")) {
          const finalUrl = `${requestBaseUrl}${url}`;

          // Don't redirect to auth pages
          if (url.startsWith("/auth/")) {
            const dashboardUrl = `${requestBaseUrl}/dashboard`;
            console.log(
              "🏠 Redirect: Auth relative URL, redirecting to dashboard:",
              dashboardUrl
            );
            return dashboardUrl;
          }

          console.log("🏠 Redirect: Relative URL:", finalUrl);
          return finalUrl;
        }

        // Handle custom error redirects
        if (url.includes("/auth/error")) {
          console.log("🏠 Redirect: Error URL:", url);
          return url;
        }

        // Parse URLs to check if they're on the same origin
        try {
          const redirectUrl = new URL(url);
          const baseUrlObj = new URL(requestBaseUrl);

          if (redirectUrl.origin === baseUrlObj.origin) {
            // Same origin - but don't redirect to auth pages
            if (redirectUrl.pathname.startsWith("/auth/")) {
              const dashboardUrl = `${requestBaseUrl}/dashboard`;
              console.log(
                "🏠 Redirect: Same origin auth page, redirecting to dashboard:",
                dashboardUrl
              );
              return dashboardUrl;
            }

            console.log("🏠 Redirect: Same origin URL:", url);
            return url;
          }

          // Different origin - redirect to dashboard
          const dashboardUrl = `${requestBaseUrl}/dashboard`;
          console.log(
            "🏠 Redirect: Different origin, redirecting to dashboard:",
            dashboardUrl
          );
          return dashboardUrl;
        } catch {
          // Invalid URL format - redirect to dashboard
          const dashboardUrl = `${requestBaseUrl}/dashboard`;
          console.log(
            "🏠 Redirect: Invalid URL, redirecting to dashboard:",
            dashboardUrl
          );
          return dashboardUrl;
        }
      } catch (error) {
        console.error("❌ Redirect error:", error);
        const fallbackUrl = `${baseUrl}/dashboard`;
        console.log("🏠 Redirect: Fallback URL:", fallbackUrl);
        return fallbackUrl;
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

  // ENHANCED DEBUGGING - CRITICAL SETTINGS
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development", // Only enable debug in development
  useSecureCookies: false, // CRITICAL: Must be false for localhost development

  // CRITICAL: Ensure proper base URL handling
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
