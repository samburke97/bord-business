// app/(auth)/verify-email/page.tsx
"use client";

import { Suspense } from "react";
import AuthFlowManager from "@/components/auth/AuthFlowManager";

function VerifyEmailContent() {
  return <AuthFlowManager />;
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
