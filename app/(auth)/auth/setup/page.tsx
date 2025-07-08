// app/(auth)/auth/setup/page.tsx - COMPLETE UPDATED VERSION
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthFlowManager from "@/components/auth/AuthFlowManager";

function AuthSetupContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return <AuthFlowManager initialEmail={email} />;
}

export default function AuthSetupPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#f9fafb",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #10b981",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <p style={{ color: "#6b7280", margin: 0 }}>
              Setting up your account...
            </p>
          </div>
        </div>
      }
    >
      <AuthSetupContent />
    </Suspense>
  );
}
