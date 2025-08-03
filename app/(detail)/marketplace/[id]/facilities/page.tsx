"use client";

import FacilitiesEditPage from "../../setup/[id]/facilities/page";

interface FacilitiesPageProps {
  params: Promise<{ id: string }>;
}

export default function FacilitiesPage({ params }: FacilitiesPageProps) {
  return <FacilitiesEditPage params={params} />;
}
