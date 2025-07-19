// app/(auth)/auth/complete-setup/page.tsx - Clean setup completion
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
      console.log("🔐 Complete Setup: Checking user status...", {
        hasSession: !!session,
        status,
        userStatus: session?.user?.status,
      });

      if (status === "loading") {
        return;
      }

      if (!session?.user) {
        console.log("❌ Complete Setup: No session, redirecting to login");
        router.push("/login");
        return;
      }

      if (session.user.status === "ACTIVE") {
        console.log(
          "✅ Complete Setup: User already ACTIVE, redirecting to dashboard"
        );
        router.push("/dashboard");
        return;
      }

      if (session.user.status === "PENDING") {
        console.log("📝 Complete Setup: User is PENDING, showing setup form");
        setIsChecking(false);
        return;
      }

      // Handle other statuses
      console.log(
        "❌ Complete Setup: Unexpected user status:",
        session.user.status
      );
      router.push("/login");
    };

    checkUserStatus();
  }, [session, status, router]);

  const handleSetupComplete = async () => {
    console.log("✅ Complete Setup: Profile setup completed");

    // Update the session to reflect new ACTIVE status
    await update();

    // Redirect to business onboarding
    router.push("/business-onboarding");
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
