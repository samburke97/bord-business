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
      window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
    } else {
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
