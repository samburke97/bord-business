// app/(auth)/auth/setup/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import BusinessSetupForm from "@/components/auth/BusinessSetupForm";

function BusinessSetupContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleSetupComplete = () => {
    // After setup, go to congratulations
    window.location.href = `/auth/congratulations`;
  };

  return (
    <BusinessSetupForm email={email} onSetupComplete={handleSetupComplete} />
  );
}

export default function BusinessSetupPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
          }}
        >
          Loading...
        </div>
      }
    >
      <BusinessSetupContent />
    </Suspense>
  );
}
