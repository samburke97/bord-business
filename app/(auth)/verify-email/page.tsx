// app/(auth)/verify-email/page.tsx (FIXED)
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import EmailVerification from "@/components/auth/EmailVerification";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const handleVerificationComplete = () => {
    // FIXED: After email verification, go to congratulations page
    // Since the user already created their account in the business setup form,
    // email verification is the final step before congratulations
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
          }}
        >
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
