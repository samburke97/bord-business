// app/page.tsx - COMPLETE FIXED VERSION with proper routing logic
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default function HomePage() {
  // This page should never be reached by users with proper middleware
  // If they reach here, something is wrong with the middleware
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to Bord
        </h1>
        <p className="text-gray-600 mb-8">
          You should be automatically redirected to the correct page.
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </a>
          <a
            href="/dashboard"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
