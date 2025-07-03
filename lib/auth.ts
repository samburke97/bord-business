// lib/auth.ts (Updated)
import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: AuthOptions = {
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
    }),

    EmailProvider({
      server: "", // Not needed with custom send function
      from: "noreply@bordsports.com",
      async sendVerificationRequest({
        identifier: email,
        url,
        provider: { from },
      }) {
        try {
          await resend.emails.send({
            from: from,
            to: email,
            subject: "Sign in to Bord for Business",
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Sign in to Bord for Business</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 40px;">
                    <img src="https://bordsports.com/bord.svg" alt="Bord" style="height: 40px;">
                  </div>
                  
                  <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Sign in to Bord for Business</h1>
                  
                  <p style="margin-bottom: 30px; font-size: 16px;">
                    Click the button below to sign in to your Bord business account. This link will expire in 24 hours.
                  </p>
                  
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${url}" style="background-color: #59d472; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block; font-size: 16px;">
                      Sign in to Bord Business
                    </a>
                  </div>
                  
                  <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    If you didn't request this email, you can safely ignore it.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  
                  <p style="color: #666; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} Bord Sports Ltd. All rights reserved.
                  </p>
                </body>
              </html>
            `,
          });
        } catch (error) {
          console.error("Failed to send verification email:", error);
          throw new Error("Failed to send verification email");
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-in attempts when email already exists
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { accounts: true },
          });

          if (existingUser) {
            // Check if this OAuth provider is already linked to the account
            const existingAccount = existingUser.accounts.find(
              (acc) => acc.provider === account.provider
            );

            if (existingAccount) {
              // Provider already linked, allow sign in
              return true;
            } else {
              // Email exists but this provider isn't linked
              // Redirect with a specific error
              return `/auth/error?error=AccountExistsWithDifferentProvider&email=${encodeURIComponent(user.email!)}&provider=${account.provider}`;
            }
          }

          // New user, allow sign in
          return true;
        } catch (error) {
          console.error("Error checking existing user:", error);
          return false;
        }
      }

      // For email provider, always allow (it handles its own verification)
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
