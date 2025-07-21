// app/(auth)/email/setup/page.tsx - Dedicated Email User Business Setup
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import BusinessSetupForm from "@/components/auth/BusinessSetupForm";

function EmailSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";

  if (!email) {
    // Redirect back to login if no email
    router.push("/login");
    return null;
  }

  const handleSetupComplete = () => {
    console.log(
      "✅ Email Setup: Profile setup complete - redirecting to email verification"
    );
    // After email user completes business setup, go to email verification
    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  };

  return (
    <BusinessSetupForm
      email={email}
      onSetupComplete={handleSetupComplete}
      isOAuth={false} // Explicitly false for email users
    />
  );
}

export default function EmailSetupPage() {
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
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: "0 0 8px 0",
                }}
              >
                Setting up your account...
              </h2>
              <p
                style={{
                  color: "#6b7280",
                  margin: 0,
                  fontSize: "14px",
                }}
              >
                Preparing your business setup form...
              </p>
            </div>
          </div>
        </div>
      }
    >
      <EmailSetupContent />
    </Suspense>
  );
}
