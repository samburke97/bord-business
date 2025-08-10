import prisma from "@/lib/prisma";

export async function cleanupPendingUsers() {
  try {
    // Delete PENDING users older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await prisma.user.deleteMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: cutoffTime,
        },
      },
    });

    return result.count;
  } catch (error) {
    throw error;
  }
}

// Run as a cron job or scheduled task
export async function runCleanupJob() {
  if (process.env.NODE_ENV === "production") {
    try {
      await cleanupPendingUsers();
    } catch (error) {
      // Log to monitoring service in production
      console.error("Cleanup job failed:", error);
    }
  }
}

// API endpoint version
// app/api/admin/cleanup-pending/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Add admin authentication here
    const cleanedCount = await cleanupPendingUsers();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedCount} pending users`,
      count: cleanedCount,
    });
  } catch (error) {
    return NextResponse.json({ message: "Cleanup failed" }, { status: 500 });
  }
}
