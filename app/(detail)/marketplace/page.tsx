"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MarketplaceDetailPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/marketplace/setup");
  }, [router]);

  return null;
}

