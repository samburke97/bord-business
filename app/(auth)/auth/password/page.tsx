// app/(auth)/auth/password/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PasswordScreen from "@/components/auth/PasswordScreen";

function PasswordContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const type = (searchParams.get("type") as "login" | "setup") || "setup";
  const name = searchParams.get("name") || "";

  const isNewUser = type === "setup";

  const handlePasswordComplete = () => {
    if (isNewUser) {
      // New users go to email verification after setting password
      window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
    } else {
      // Existing users are handled in PasswordScreen component
      // This shouldn't be called for existing users since they sign in directly
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
