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
    if (isNewUser) {
      router.push(`/email/setup?email=${encodeURIComponent(email)}`);
    } else {
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
