// lib/debug/session.ts - SESSION DEBUGGING UTILITY
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export interface SessionDebugInfo {
  hasSession: boolean;
  sessionData?: any;
  hasToken: boolean;
  tokenData?: any;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

export async function debugSession(
  req?: NextRequest
): Promise<SessionDebugInfo> {
  const timestamp = new Date().toISOString();

  try {
    // Get server session
    const session = await getServerSession(authOptions);

    // Get JWT token if request is provided
    let token = null;
    if (req) {
      token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
    }

    const debugInfo: SessionDebugInfo = {
      hasSession: !!session,
      sessionData: session
        ? {
            userId: session.user?.id,
            email: session.user?.email,
            name: session.user?.name,
            globalRole: session.user?.globalRole,
            isVerified: session.user?.isVerified,
            isActive: session.user?.isActive,
          }
        : null,
      hasToken: !!token,
      tokenData: token
        ? {
            sub: token.sub,
            email: token.email,
            globalRole: token.globalRole,
            isVerified: token.isVerified,
            isActive: token.isActive,
            iat: token.iat,
            exp: token.exp,
          }
        : null,
      timestamp,
      userAgent: req?.headers.get("user-agent") || undefined,
      ip:
        req?.headers.get("x-forwarded-for") ||
        req?.headers.get("x-real-ip") ||
        undefined,
    };

    return debugInfo;
  } catch (error) {
    console.error("❌ Session Debug Error:", error);

    return {
      hasSession: false,
      hasToken: false,
      timestamp,
      userAgent: req?.headers.get("user-agent") || undefined,
      ip:
        req?.headers.get("x-forwarded-for") ||
        req?.headers.get("x-real-ip") ||
        undefined,
    };
  }
}

export function logSessionDebug(
  debugInfo: SessionDebugInfo,
  context: string = "Unknown"
) {
  console.log(`🔍 Session Debug [${context}]:`, {
    timestamp: debugInfo.timestamp,
    hasSession: debugInfo.hasSession,
    hasToken: debugInfo.hasToken,
    userId: debugInfo.sessionData?.userId || debugInfo.tokenData?.sub,
    email: debugInfo.sessionData?.email || debugInfo.tokenData?.email,
    role: debugInfo.sessionData?.globalRole || debugInfo.tokenData?.globalRole,
    verified:
      debugInfo.sessionData?.isVerified || debugInfo.tokenData?.isVerified,
    active: debugInfo.sessionData?.isActive || debugInfo.tokenData?.isActive,
    ip: debugInfo.ip,
    userAgent: debugInfo.userAgent?.substring(0, 100) + "...",
  });
}

// Helper function for API routes
export async function createApiSessionDebugHandler(context: string) {
  return async function (req: NextRequest) {
    const debugInfo = await debugSession(req);
    logSessionDebug(debugInfo, context);
    return debugInfo;
  };
}
