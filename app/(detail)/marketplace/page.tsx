"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MarketplaceDetailPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to marketplace setup
    router.push("/marketplace/setup");
  }, [router]);

  return null; // This page will redirect, so no content needed
}
