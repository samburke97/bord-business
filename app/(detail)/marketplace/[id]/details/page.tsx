"use client";

import DetailsEditPage from "../../setup/[id]/details/page";

interface DetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function DetailsPage({ params }: DetailsPageProps) {
  return <DetailsEditPage params={params} />;
}
