// app/(auth)/verify-email/page.tsx - CORRECT - Go to congratulations first
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import EmailVerification from "@/components/auth/EmailVerification";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleVerificationComplete = () => {
    console.log("✅ Email verification complete - showing congratulations");

    // CORRECT: After email verification, show congratulations
    // Then congratulations should route to business onboarding (not profile setup again)
    window.location.href = `/auth/congratulations`;
  };

  return (
    <EmailVerification
      email={email}
      onVerificationComplete={handleVerificationComplete}
    />
  );
}

export default function VerifyEmailPage() {
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
            />
            <p style={{ color: "#6b7280", margin: 0 }}>
              Loading verification...
            </p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
