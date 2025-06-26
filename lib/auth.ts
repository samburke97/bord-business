import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Add credentials provider for admin login
    CredentialsProvider({
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Check against hardcoded admin credentials
        if (
          credentials?.email === "admin@bordsports.com" &&
          credentials?.password === "SamJohnny97!"
        ) {
          return {
            id: "admin-user",
            name: "Admin User",
            email: "admin@bordsports.com",
            role: "ADMIN",
          };
        }
        return null;
      },
    }),

    // Keep Google provider but restrict to bordsports.com domain
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
  ],
  callbacks: {
    // Update session callback to work with JWT
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as "USER" | "ADMIN" | "SUPER_ADMIN";
      }
      return session;
    },

    // Add JWT callback to store user data in token
    async jwt({ token, user }) {
      if (user) {
        // This runs only on sign in
        token.role = user.role;

        // If using credentials, we need to explicitly set the role
        if (user.email === "admin@bordsports.com") {
          token.role = "ADMIN";
        }
      }
      return token;
    },

    async redirect({ url, baseUrl }) {
      // More explicit redirect logic
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    async signIn({ user, account, profile }) {
      // For credentials, we already validated in authorize
      if (account?.provider === "credentials") {
        return true;
      }

      // For Google, restrict to bordsports.com domain
      if (account?.provider === "google") {
        return user.email?.endsWith("@bordsports.com") ?? false;
      }

      return false;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
