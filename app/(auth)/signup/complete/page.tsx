// app/(auth)/oauth/setup/page.tsx - Clean setup completion
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BusinessSetupForm from "@/components/auth/BusinessSetupForm";

export default function CompleteSetupPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (status === "loading") {
        return;
      }

      if (!session?.user) {
        router.push("/login");
        return;
      }

      if (session.user.status === "ACTIVE") {
        router.push("/dashboard");
        return;
      }

      if (session.user.status === "PENDING") {
        setIsChecking(false);
        return;
      }

      router.push("/login");
    };

    checkUserStatus();
  }, [session, status, router]);

  const handleSetupComplete = async () => {
    // Update the session to reflect new ACTIVE status
    await update();

    // Redirect to business onboarding
    router.push("/business/onboarding");
  };

  if (isChecking || status === "loading") {
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
              Completing your setup...
            </h2>
            <p
              style={{
                color: "#6b7280",
                margin: 0,
                fontSize: "14px",
              }}
            >
              Preparing your profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BusinessSetupForm
      email={session?.user?.email || ""}
      onSetupComplete={handleSetupComplete}
      isOAuth={true}
    />
  );
}
