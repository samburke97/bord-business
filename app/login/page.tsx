// app/login/page.tsx
"use client";

import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <LoginForm
      accountType="business"
      title="Bord for Business"
      description="Create an account or log in to manage your business on bord."
      callbackUrl="/"
    />
  );
}
