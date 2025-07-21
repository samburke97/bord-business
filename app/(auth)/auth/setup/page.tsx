// app/(auth)/auth/setup/page.tsx - REDIRECT PAGE (No longer needed)
// This route should redirect users to the correct flow
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthSetupRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const email = searchParams.get("email");
    const method = searchParams.get("method");

    console.log("🔄 Auth Setup Redirect: Redirecting to correct flow", {
      email: email ? email.substring(0, 3) + "***" : "none",
      method,
    });

    // Redirect to the appropriate setup page based on method
    if (method === "oauth") {
      router.replace("/oauth/setup");
    } else if (method === "email" && email) {
      router.replace(`/email/setup?email=${encodeURIComponent(email)}`);
    } else if (email) {
      // Default to email flow if email is provided
      router.replace(`/email/setup?email=${encodeURIComponent(email)}`);
    } else {
      // No email or method, go back to login
      router.replace("/login");
    }
  }, [router, searchParams]);

  // Show loading while redirecting
  return (
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
            Redirecting...
          </h2>
          <p
            style={{
              color: "#6b7280",
              margin: 0,
              fontSize: "14px",
            }}
          >
            Taking you to the right place...
          </p>
        </div>
      </div>
    </div>
  );
}
