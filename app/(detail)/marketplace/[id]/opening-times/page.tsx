"use client";

import OpeningTimesEditPage from "../../setup/edit/[id]/opening-times/page";

interface OpeningTimesPageProps {
  params: Promise<{ id: string }>;
}

export default function OpeningTimesPage({ params }: OpeningTimesPageProps) {
  return <OpeningTimesEditPage params={params} />;
}
