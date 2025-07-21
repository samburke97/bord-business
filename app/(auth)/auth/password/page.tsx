// app/(auth)/auth/password/page.tsx - Handles existing email users
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import PasswordScreen from "@/components/auth/PasswordScreen";

function PasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const type = (searchParams.get("type") as "login" | "setup") || "login";
  const name = searchParams.get("name") || "";

  if (!email) {
    // Redirect back to login if no email
    router.push("/login");
    return null;
  }

  const isNewUser = type === "setup";

  const handlePasswordComplete = () => {
    console.log("✅ Password complete, user is existing:", !isNewUser);

    if (isNewUser) {
      // This shouldn't happen in the new flow, but fallback to email setup
      console.log(
        "🔄 New user in password screen - redirecting to email setup"
      );
      router.push(`/email/setup?email=${encodeURIComponent(email)}`);
    } else {
      // Existing user - check where they should go next
      console.log("✅ Existing user login complete - checking status");

      // For existing users, we should check their completion status
      // and route them appropriately (dashboard, business setup, etc.)
      router.push("/");
    }
  };

  return (
    <PasswordScreen
      email={email}
      userName={name}
      isNewUser={isNewUser}
      onPasswordComplete={handlePasswordComplete}
    />
  );
}

export default function PasswordPage() {
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
      <PasswordContent />
    </Suspense>
  );
}
