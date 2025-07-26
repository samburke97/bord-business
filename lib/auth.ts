import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { CredentialsService } from "@/lib/auth/CredentialsService";
import { OAuthService } from "@/lib/auth/OAuthService";
import { SessionService } from "@/lib/auth/SessionService";
import { RedirectService } from "@/lib/auth/RedirectService";

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
        return await CredentialsService.authenticate(
          credentials?.email || "",
          credentials?.password || ""
        );
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/oauth/error",
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
        if (
          account?.provider === "google" ||
          account?.provider === "facebook"
        ) {
          const existingUser = await OAuthService.handleExistingUser(
            user,
            account
          );

          if (existingUser) {
            // Update user object for JWT
            Object.assign(user, {
              id: existingUser.id,
              globalRole: existingUser.globalRole,
              isVerified: existingUser.isVerified,
              isActive: existingUser.isActive,
              status: existingUser.status,
            });
          } else {
            // Create new user
            const newUser = await OAuthService.createNewUser(user, account);
            Object.assign(user, {
              id: newUser.id,
              globalRole: newUser.globalRole,
              isVerified: newUser.isVerified,
              isActive: newUser.isActive,
              status: newUser.status,
            });
          }
        }
        return true;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("OAuthAccountNotLinked")
        ) {
          return false;
        }
        console.error("SignIn callback error:", error);
        return false;
      }
    },

    async session({ session, token }) {
      return SessionService.buildSession(session, token);
    },

    async jwt({ token, user, account, trigger }) {
      return SessionService.buildJWT(token, user, account, trigger);
    },

    async redirect({ url, baseUrl }) {
      return RedirectService.handleRedirect(url, baseUrl);
    },
  },
};
