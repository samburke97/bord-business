"use client";

import GalleryEditPage from "../../setup/edit/[id]/gallery/page";

interface GalleryPageProps {
  params: Promise<{ id: string }>;
}

export default function GalleryPage({ params }: GalleryPageProps) {
  return <GalleryEditPage params={params} />;
}
