// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import React from "react";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Bord Admin",
  description: "Bord Admin Dashboard",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Summary Cards */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg text-gray-500 font-normal mb-2">
          Total Centers
        </h2>
        <p className="text-4xl font-bold">124</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg text-gray-500 font-normal mb-2">
          Active Sports
        </h2>
        <p className="text-4xl font-bold">38</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg text-gray-500 font-normal mb-2">Total Users</h2>
        <p className="text-4xl font-bold">2,845</p>
      </div>
    </div>
  );
}
