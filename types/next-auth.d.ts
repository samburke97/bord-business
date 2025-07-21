// types/next-auth.d.ts - FIXED: Added missing status field
import "next-auth";
import { UserRole, UserStatus } from "@prisma/client";

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
    status?: UserStatus; // CRITICAL FIX: Add status field
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
      status?: UserStatus; // CRITICAL FIX: Add status field
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
    status?: UserStatus; // CRITICAL FIX: Add status field
  }
}
