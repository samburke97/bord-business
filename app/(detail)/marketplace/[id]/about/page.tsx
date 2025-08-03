"use client";

import EditAboutPage from "../../setup/edit/[id]/about/page";

interface AboutPageProps {
  params: Promise<{ id: string }>;
}

export default function AboutPage({ params }: AboutPageProps) {
  return <EditAboutPage params={params} />;
}
