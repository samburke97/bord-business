// types/next-auth.d.ts - CORRECTED TYPES
import "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    // Custom fields from your database
    globalRole?: UserRole;
    isVerified?: boolean;
    isActive?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      // Custom fields from your database
      globalRole?: UserRole;
      isVerified?: boolean;
      isActive?: boolean;
    };
  }
}

// The `JWT` interface can be used to have more detailed control over the token
declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    // Custom fields from your database
    globalRole?: UserRole;
    isVerified?: boolean;
    isActive?: boolean;
  }
}
