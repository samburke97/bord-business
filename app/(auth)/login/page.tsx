// app/login/business/page.tsx
"use client";

import LoginForm from "@/components/auth/LoginForm";

export default function BusinessLoginPage() {
  return (
    <LoginForm
      accountType="business"
      title="Bord for Business"
      description="Create an account or log in to manage your business on bord."
      callbackUrl="/dashboard"
    />
  );
}
